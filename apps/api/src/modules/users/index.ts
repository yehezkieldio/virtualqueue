import { db } from "@virtualqueue/database";
import { type SQLWrapper, and, asc, desc, eq, ilike, isNull, sql } from "@virtualqueue/database/drizzle";
import { type RolesType, table, users } from "@virtualqueue/database/schema";
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
);
