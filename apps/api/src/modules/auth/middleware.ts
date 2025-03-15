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

        const isBlacklisted = await record("dragonfly.blacklist.check", async () =>
            dragonfly.get(`blacklist:access:${accessToken.value}`)
        );

        if (isBlacklisted) {
            set.status = "Unauthorized";
            throw error("Unauthorized", "Token has been revoked");
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

        return {
            user: jwtPayload,
            accessToken: accessToken.value,
        };
    })
);
