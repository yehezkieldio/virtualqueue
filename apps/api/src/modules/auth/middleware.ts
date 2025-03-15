import jwt from "@elysiajs/jwt";
import { record } from "@elysiajs/opentelemetry";
import { dragonfly } from "@virtualqueue/dragonfly";
import { env } from "@virtualqueue/environment";
import Elysia from "elysia";

export const authMiddleware = new Elysia({ name: "Middleware.Auth" }).use(
    jwt({
        name: "jwt",
        secret: env.JWT_SECRET,
    }).derive(async ({ jwt, cookie: { accessToken }, set, error }) => {
        if (!accessToken) {
            set.status = "Unauthorized";
            throw error("Unauthorized", "Unauthorized");
        }

        const jwtPayload = await jwt.verify(accessToken.value);
        if (
            !jwtPayload ||
            typeof jwtPayload !== "object" ||
            !("exp" in jwtPayload) ||
            typeof jwtPayload.exp !== "number"
        ) {
            set.status = "Forbidden";
            throw error("Forbidden", "Invalid token");
        }

        if (jwtPayload.exp && jwtPayload.exp < Date.now() / 1000) {
            set.status = "Forbidden";
            throw error("Forbidden", "Token expired");
        }

        const ttl: number = jwtPayload.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
            await record("dragonfly.blacklist.add", async () =>
                dragonfly.set(`blacklist:access:${accessToken.value}`, "1", "EX", ttl)
            );
        }

        return {
            user: jwtPayload,
            accessToken: accessToken.value,
        };
    })
);
