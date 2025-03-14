import { type SQLWrapper, and, asc, db, desc, eq, ilike, isNull, sql } from "@virtualqueue/database";
import { type RolesType, _selectUser, users } from "@virtualqueue/database/schema";
import Elysia, { t } from "elysia";
import { PaginationMetaSchema, createPaginatedResponseSchema } from "#utils/response";

const userResponseSchema = t.Omit(_selectUser, ["password", "deletedAt"]);

export const usersModule = new Elysia({ name: "Module.User", tags: ["Users"] }).group("/users", (api) =>
    api
        .model({
            "user.many": t.Array(userResponseSchema),
            "user.one": userResponseSchema,
            "user.paginated": createPaginatedResponseSchema(userResponseSchema),
        })
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

                conditions.push(isNull(users.deletedAt));

                if (search) {
                    conditions.push(ilike(users.fullname, `%${search}%`));
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
                query: PaginationMetaSchema,
                response: "user.paginated",
                detail: {
                    description: "View all users.",
                },
            }
        )
        .get(
            "/:id",
            async (ctx) => {
                const user = await db.query.users.findFirst({
                    where: eq(users.id, ctx.params.id),
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
