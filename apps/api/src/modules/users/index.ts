import { type SQLWrapper, and, asc, db, desc, eq, ilike, isNull, sql } from "@virtualqueue/database";
import { type RolesType, selectUserSchema, users } from "@virtualqueue/database/schema";
import Elysia, { t } from "elysia";

export const usersModule = new Elysia({ name: "Module.User", tags: ["Users"] }).group("/users", (api) =>
    api
        .model({
            "user.many": t.Array(t.Omit(selectUserSchema, ["password", "deletedAt"])),
            "user.one": t.Omit(selectUserSchema, ["password", "deletedAt"]),
            "user.paginated": t.Object({
                data: t.Array(t.Omit(selectUserSchema, ["password", "deletedAt"])),
                meta: t.Object({
                    page: t.Number({ minimum: 1, default: 1 }),
                    limit: t.Number({ minimum: 1, default: 10 }),
                    totalItems: t.Number(),
                    totalPages: t.Number(),
                    hasNext: t.Boolean(),
                    hasPrev: t.Boolean(),
                }),
            }),
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
                query: t.Object({
                    page: t.Optional(t.String({ pattern: "^[1-9][0-9]*$" })),
                    limit: t.Optional(t.String({ pattern: "^[1-9][0-9]*$" })),
                    search: t.Optional(t.String()),
                    role: t.Optional(t.String()),
                    sortBy: t.Optional(t.String()),
                    sortOrder: t.Optional(t.String()),
                }),
                response: "user.paginated",
                detail: {
                    description: "View all users.",
                },
            }
        )
);
