import { db } from "@virtualqueue/database";
import { selectUserSchema } from "@virtualqueue/database/schema";
import Elysia, { t } from "elysia";

export const usersModule = new Elysia({ name: "Module.User", tags: ["Users"] }).group("/users", (api) =>
    api
        .model({
            "user.many": t.Array(t.Omit(selectUserSchema, ["password", "deletedAt"])),
            "user.one": t.Omit(selectUserSchema, ["password", "deletedAt"]),
        })
        .get(
            "/",
            async () => {
                const users = await db.query.users.findMany({
                    columns: {
                        password: false,
                        deletedAt: false,
                    },
                });

                return users;
            },
            {
                response: "user.many",
                detail: {
                    description: "View all users.",
                },
            }
        )
);
