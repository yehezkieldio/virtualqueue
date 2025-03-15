import jwt from "@elysiajs/jwt";
import { record } from "@elysiajs/opentelemetry";
import { dragonfly } from "@virtualqueue/dragonfly";
import { env } from "@virtualqueue/environment";
import Elysia from "elysia";
import { updateSessionActivity } from "./session";
import { ACCESS_TOKEN_EXPIRATION } from "./utils";

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

        const currentTime = Math.floor(Date.now() / 1000);
        const tokenExp = jwtPayload.exp;

        if (tokenExp < currentTime) {
            set.status = "Forbidden";
            throw error("Forbidden", "Token expired");
        }

        const timeToExpire = tokenExp - currentTime;
        const refreshThreshold = ACCESS_TOKEN_EXPIRATION * 0.3; // Refresh if less than 30% of time remains

        let newToken = "";
        if (timeToExpire < refreshThreshold) {
            newToken = await jwt.sign({
                sub: jwtPayload.sub!,
                iat: currentTime,
                exp: currentTime + ACCESS_TOKEN_EXPIRATION,
            });

            accessToken.set({
                value: newToken,
                httpOnly: true,
                maxAge: ACCESS_TOKEN_EXPIRATION,
                path: "/",
                sameSite: "strict",
                secure: env.NODE_ENV === "production", // Only HTTPS in production
            });

            if (typeof jwtPayload.jti === "string" && jwtPayload.jti) {
                await updateSessionActivity(jwtPayload.jti).catch(() => {
                    // Silently fail, don't block the request if session update fails
                });
            }
        }

        return {
            user: jwtPayload,
            accessToken: newToken || accessToken.value,
        };
    })
);
