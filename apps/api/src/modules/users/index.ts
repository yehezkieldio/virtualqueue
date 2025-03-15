import { db } from "@virtualqueue/database";
import { cuid } from "@virtualqueue/database/cuid";
import { type SQLWrapper, and, asc, desc, eq, ilike, isNull, sql } from "@virtualqueue/database/drizzle";
import {
    getErrorMessage,
    isEnumValueError,
    isNotNullConstraintError,
    isUniqueConstraintError,
} from "@virtualqueue/database/errors";
import { type RolesType, table, users } from "@virtualqueue/database/schema";
import { getPasswordValidationIssues, validatePassword } from "@virtualqueue/database/validation";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-typebox";
import Elysia, { t } from "elysia";
import { PaginationQuerySchema, createPaginatedSchema } from "#utils/response";

const _selectUser = createSelectSchema(table.users);
const selectUserSchema = t.Omit(_selectUser, ["password", "deletedAt"]);

const _createUser = createInsertSchema(table.users, {
    email: t.String({ format: "email" }),
});
const createUserSchema = t.Omit(_createUser, ["id", "createdAt", "updatedAt", "deletedAt"]);

const _updateUser = createUpdateSchema(table.users);
const updateUserSchema = t.Omit(_updateUser, ["id", "createdAt", "updatedAt", "deletedAt"]);

export const usersModule = new Elysia({ name: "Module.User", tags: ["Users"] }).group("/users", (api) =>
    api
        .model({
            "user.many": t.Array(selectUserSchema),
            "user.one": selectUserSchema,
            "user.paginated": createPaginatedSchema(selectUserSchema),
        })
        /* -------------------------------------------------------------------------- */
        .get(
            "/",
            async ({ query }) => {
                const page = Math.max(1, Number(query.page) || 1);
                const limit = Math.max(1, Number(query.limit) || 10);
                const search = query.search as string | undefined;
                const role = query.role as string | undefined;
                const sortBy = (query.sortBy as string) || "createdAt";
                const sortOrder = query.sortOrder === "asc" ? asc : desc;

                const offset = (page - 1) * limit;
                const conditions: SQLWrapper[] = [];

                conditions.push(isNull(table.users.deletedAt));

                if (search) {
                    conditions.push(ilike(table.users.fullname, `%${search}%`));
                }

                if (role && ["USER", "ADMIN", "SUPERADMIN"].includes(role)) {
                    conditions.push(eq(users.role, role as RolesType));
                }

                const totalItemsResult = await db
                    .select({
                        count: sql<number>`cast(count(*) as int)`,
                    })
                    .from(users)
                    .where(and(...conditions));

                const totalItems: number = totalItemsResult[0]?.count || 0;

                const usersList = await db.query.users.findMany({
                    columns: {
                        password: false,
                        deletedAt: false,
                    },
                    where: and(...conditions),
                    limit: limit,
                    offset: offset,
                    orderBy:
                        sortBy === "fullname"
                            ? sortOrder(users.fullname)
                            : sortBy === "email"
                              ? sortOrder(users.email)
                              : sortOrder(users.createdAt),
                });

                const totalPages: number = Math.ceil(totalItems / limit);

                return {
                    data: usersList,
                    meta: {
                        page,
                        limit,
                        totalItems,
                        totalPages,
                        hasNext: page < totalPages,
                        hasPrev: page > 1,
                    },
                };
            },
            {
                query: PaginationQuerySchema,
                response: "user.paginated",
                detail: {
                    description: "View all users.",
                },
            }
        )
        /* -------------------------------------------------------------------------- */
        .get(
            "/:id",
            async (ctx) => {
                const user = await db.query.users.findFirst({
                    where: and(eq(users.id, ctx.params.id), isNull(users.deletedAt)),
                    columns: {
                        password: false,
                        deletedAt: false,
                    },
                });

                if (!user) {
                    throw ctx.error("Not Found", "User not found.");
                }

                return user;
            },
            {
                params: t.Object({
                    id: t.String({
                        description: "The ID of the user to view.",
                    }),
                }),
                response: {
                    200: "user.one",
                    404: t.String({
                        default: "User not found.",
                    }),
                },
                detail: {
                    description: "View user by ID.",
                },
            }
        )
        /* -------------------------------------------------------------------------- */
        .post(
            "/",
            async (ctx) => {
                if (validatePassword(ctx.body.password) !== true) {
                    throw ctx.error("Bad Request", getPasswordValidationIssues(ctx.body.password).join(", "));
                }

                try {
                    await db.insert(users).values({
                        id: cuid(),
                        ...ctx.body,
                        password: await Bun.password.hash(ctx.body.password),
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        deletedAt: null,
                    });
                } catch (error) {
                    if (isUniqueConstraintError(error)) {
                        throw ctx.error("Conflict", getErrorMessage(error));
                    }

                    if (isNotNullConstraintError(error)) {
                        throw ctx.error("Bad Request", getErrorMessage(error));
                    }

                    if (isEnumValueError(error)) {
                        throw ctx.error("Bad Request", "Invalid role value provided");
                    }

                    ctx.set.status = 500;
                    throw ctx.error("Internal Server Error", "An error occurred while creating the user.");
                }

                ctx.set.status = "Created";

                return "User created successfully.";
            },
            {
                body: createUserSchema,
                response: {
                    201: t.String({
                        default: "User created successfully.",
                    }),
                    400: t.String({
                        default: "Invalid data provided.",
                    }),
                    409: t.String({
                        default: "Email address is already in use.",
                    }),
                    500: t.String({
                        default: "An error occurred while creating the user.",
                    }),
                },
                detail: {
                    description: "Create a new user.",
                },
            }
        )
        /* -------------------------------------------------------------------------- */
        .put(
            "/:id",
            async (ctx) => {
                const existingUser = await db.query.users.findFirst({
                    where: and(eq(users.id, ctx.params.id), isNull(users.deletedAt)),
                });

                if (!existingUser) {
                    throw ctx.error("Not Found", "User not found.");
                }

                try {
                    await db
                        .update(users)
                        .set({
                            ...ctx.body,
                            updatedAt: new Date(),
                        })
                        .where(eq(users.id, ctx.params.id));
                } catch (error) {
                    if (isUniqueConstraintError(error)) {
                        throw ctx.error("Conflict", getErrorMessage(error));
                    }

                    if (isNotNullConstraintError(error)) {
                        throw ctx.error("Bad Request", getErrorMessage(error));
                    }

                    if (isEnumValueError(error)) {
                        throw ctx.error("Bad Request", "Invalid role value provided");
                    }

                    throw ctx.error("Internal Server Error", "An error occurred while updating the user.");
                }

                ctx.set.status = 204;
                return "User updated successfully.";
            },
            {
                params: t.Object({
                    id: t.String({
                        description: "The ID of the user to update.",
                    }),
                }),
                body: t.Omit(_updateUser, ["id", "password", "createdAt", "updatedAt", "deletedAt"]),
                response: {
                    204: t.String({
                        default: "User updated successfully.",
                    }),
                    400: t.String({
                        default: "Invalid data provided.",
                    }),
                    404: t.String({
                        default: "User not found.",
                    }),
                    409: t.String({
                        default: "Email address is already in use.",
                    }),
                    500: t.String({
                        default: "An error occurred while updating the user.",
                    }),
                },
                detail: {
                    description: "Replace all user data.",
                },
            }
        )
        /* -------------------------------------------------------------------------- */
        .put(
            "/:id/password",
            async (ctx) => {
                const existingUser = await db.query.users.findFirst({
                    where: and(eq(users.id, ctx.params.id), isNull(users.deletedAt)),
                });

                if (!existingUser) {
                    throw ctx.error("Not Found", "User not found.");
                }

                if (ctx.body.oldPassword === ctx.body.password) {
                    throw ctx.error("Bad Request", "New password must be different from the old password.");
                }

                if (!validatePassword(ctx.body.password)) {
                    throw ctx.error("Bad Request", getPasswordValidationIssues(ctx.body.password).join(", "));
                }

                try {
                    await db
                        .update(users)
                        .set({
                            password: await Bun.password.hash(ctx.body.password),
                            updatedAt: new Date(),
                        })
                        .where(eq(users.id, ctx.params.id));
                } catch (_error) {
                    throw ctx.error("Internal Server Error", "An error occurred while updating the user password.");
                }

                ctx.set.status = 204;
                return "User password updated successfully.";
            },
            {
                params: t.Object({
                    id: t.String({
                        description: "The ID of the user to update.",
                    }),
                }),
                body: t.Object({
                    oldPassword: t.String({
                        description: "The old password of the user.",
                    }),
                    password: t.String({
                        description: "The new password for the user.",
                    }),
                }),
                response: {
                    204: t.String({
                        default: "User password updated successfully.",
                    }),
                    400: t.String({
                        default: "Invalid data provided.",
                    }),
                    404: t.String({
                        default: "User not found.",
                    }),
                    500: t.String({
                        default: "An error occurred while updating the user password.",
                    }),
                },
                detail: {
                    description: "Update user password.",
                },
            }
        )
        /* -------------------------------------------------------------------------- */
        .patch(
            "/:id",
            async (ctx) => {
                const existingUser = await db.query.users.findFirst({
                    where: and(eq(users.id, ctx.params.id), isNull(users.deletedAt)),
                });

                if (!existingUser) {
                    throw ctx.error("Not Found", "User not found.");
                }

                try {
                    const updateData: Partial<typeof ctx.body> = { ...ctx.body };

                    await db
                        .update(users)
                        .set({
                            ...updateData,
                            updatedAt: new Date(),
                        })
                        .where(eq(users.id, ctx.params.id));
                } catch (error) {
                    if (isUniqueConstraintError(error)) {
                        throw ctx.error("Conflict", getErrorMessage(error));
                    }

                    if (isNotNullConstraintError(error)) {
                        throw ctx.error("Bad Request", getErrorMessage(error));
                    }

                    if (isEnumValueError(error)) {
                        throw ctx.error("Bad Request", "Invalid role value provided");
                    }

                    throw ctx.error("Internal Server Error", "An error occurred while updating the user.");
                }

                ctx.set.status = 204;
                return "User updated successfully.";
            },
            {
                params: t.Object({
                    id: t.String({
                        description: "The ID of the user to partially update.",
                    }),
                }),
                body: t.Partial(t.Omit(_updateUser, ["id", "createdAt", "updatedAt", "deletedAt"])),
                response: {
                    204: t.String({
                        default: "User updated successfully.",
                    }),
                    400: t.String({
                        default: "Invalid data provided.",
                    }),
                    404: t.String({
                        default: "User not found.",
                    }),
                    409: t.String({
                        default: "Email address is already in use.",
                    }),
                    500: t.String({
                        default: "An error occurred while updating the user.",
                    }),
                },
                detail: {
                    description: "Update specific user fields.",
                },
            }
        )
        /* -------------------------------------------------------------------------- */
        .delete(
            "/:id",
            async (ctx) => {
                const permanentDelete: boolean = ctx.query.permanent === "true";
                const userId: string = ctx.params.id;

                const existingUser = await db.query.users.findFirst({
                    where: and(eq(users.id, userId), isNull(users.deletedAt)),
                });

                if (!existingUser) {
                    throw ctx.error("Not Found", "User not found.");
                }

                try {
                    if (permanentDelete) {
                        await db.delete(users).where(eq(users.id, userId));

                        ctx.set.status = 200;
                        return "User permanently deleted.";
                    }

                    await db
                        .update(users)
                        .set({
                            deletedAt: new Date(),
                            updatedAt: new Date(),
                        })
                        .where(eq(users.id, userId));
                } catch (_error) {
                    throw ctx.error("Internal Server Error", "An error occurred while deleting the user.");
                }

                ctx.set.status = 200;
                return "User deleted.";
            },
            {
                params: t.Object({
                    id: t.String({
                        description: "The ID of the user to delete.",
                    }),
                }),
                query: t.Object({
                    permanent: t.Optional(
                        t.String({
                            description: "Whether to permanently delete the user.",
                            enum: ["true", "false"],
                            default: "false",
                        })
                    ),
                }),
                response: {
                    200: t.String({
                        description: "Success message",
                        default: "User deleted.",
                    }),
                    404: t.String({
                        default: "User not found.",
                    }),
                    500: t.String({
                        default: "An error occurred while deleting the user.",
                    }),
                },
                detail: {
                    description: "Delete a user (soft delete by default, permanent if ?permanent=true).",
                },
            }
        )
        /* -------------------------------------------------------------------------- */
        .post(
            "/:id/restore",
            async (ctx) => {
                const userId: string = ctx.params.id;

                const existingUser = await db.query.users.findFirst({
                    where: eq(users.id, userId),
                });

                if (!existingUser) {
                    throw ctx.error("Not Found", "User not found.");
                }

                if (!existingUser.deletedAt) {
                    throw ctx.error("Bad Request", "User is not deleted.");
                }

                try {
                    await db
                        .update(users)
                        .set({
                            deletedAt: null,
                            updatedAt: new Date(),
                        })
                        .where(eq(users.id, userId));
                } catch (error) {
                    throw ctx.error("Internal Server Error", "An error occurred while restoring the user.");
                }

                ctx.set.status = 200;
                return "User restored successfully.";
            },
            {
                params: t.Object({
                    id: t.String({
                        description: "The ID of the user to restore.",
                    }),
                }),
                response: {
                    200: t.String({
                        description: "Success message",
                        default: "User restored successfully.",
                    }),
                    400: t.String({
                        default: "User is not deleted.",
                    }),
                    404: t.String({
                        default: "User not found.",
                    }),
                    500: t.String({
                        default: "An error occurred while restoring the user.",
                    }),
                },
                detail: {
                    description: "Restore a soft-deleted user.",
                },
            }
        )
);
