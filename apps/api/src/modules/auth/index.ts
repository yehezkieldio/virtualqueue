import jwt from "@elysiajs/jwt";
import { record } from "@elysiajs/opentelemetry";
import { db } from "@virtualqueue/database";
import { cuid } from "@virtualqueue/database/cuid";
import { and, eq, isNull } from "@virtualqueue/database/drizzle";
import { users } from "@virtualqueue/database/schema";
import { dragonfly } from "@virtualqueue/dragonfly";
import { env } from "@virtualqueue/environment";
import Elysia, { type Cookie, t } from "elysia";
import { authMiddleware } from "./middleware";
import { ACCESS_TOKEN_EXPIRATION, REFRESH_TOKEN_EXPIRATION, getExpireTimestamp } from "./utils";

export const authModule = new Elysia({ name: "Module.Auth", tags: ["Auth"] }).group("/auth", (api) =>
    api.use(
        jwt({
            name: "jwt",
            secret: env.JWT_SECRET,
        })
            /* -------------------------------------------------------------------------- */
            .post(
                "/signin",
                async ({ body, cookie: { accessToken, refreshToken }, jwt, error }) => {
                    return await record("auth.signin", async () => {
                        const user = await record("database.users.first", async () => {
                            return await db.query.users.findFirst({
                                where: and(eq(users.email, body.email), isNull(users.deletedAt)),
                                columns: {
                                    deletedAt: false,
                                },
                            });
                        });

                        if (!user) {
                            throw error("Not Found", "User not found.");
                        }

                        const isValidPassword: boolean = await Bun.password.verify(body.password, user.password);
                        if (!isValidPassword) {
                            throw error("Bad Request", "Invalid password.");
                        }

                        const initialAccessToken: string = await jwt.sign({
                            sub: user.id,
                            iat: Math.floor(Date.now() / 1000),
                            exp: getExpireTimestamp(ACCESS_TOKEN_EXPIRATION),
                        });

                        if (accessToken) {
                            accessToken.set({
                                value: initialAccessToken,
                                httpOnly: true,
                                maxAge: ACCESS_TOKEN_EXPIRATION,
                                path: "/",
                            });
                        }

                        const initialRefreshToken = await jwt.sign({
                            sub: user.id,
                            exp: getExpireTimestamp(REFRESH_TOKEN_EXPIRATION),
                            iat: Math.floor(Date.now() / 1000),
                            jti: cuid(),
                        });

                        if (refreshToken) {
                            refreshToken.set({
                                value: initialRefreshToken,
                                httpOnly: true,
                                maxAge: REFRESH_TOKEN_EXPIRATION,
                                path: "/",
                            });
                        }

                        return {
                            accessToken: initialAccessToken,
                            refreshToken: initialRefreshToken,
                        };
                    });
                },
                {
                    body: t.Object({
                        email: t.String({
                            error: "Email is required",
                        }),
                        password: t.String({
                            error: "Password is required",
                        }),
                    }),
                    response: {
                        200: t.Object({
                            accessToken: t.String(),
                            refreshToken: t.String(),
                        }),
                        404: t.String(),
                        400: t.String(),
                    },
                    detail: {
                        description: "Sign in a user",
                    },
                }
            )
            /* -------------------------------------------------------------------------- */
            .use(authMiddleware)
            /* -------------------------------------------------------------------------- */
            .post(
                "/refresh",
                async ({ error, cookie: { accessToken, refreshToken }, jwt }) => {
                    return await record("auth.refresh", async () => {
                        try {
                            if (!refreshToken?.value) {
                                throw error("Unauthorized", "No refresh token provided");
                            }

                            const decoded = await jwt.verify(refreshToken.value);
                            if (
                                !decoded ||
                                typeof decoded !== "object" ||
                                !("sub" in decoded) ||
                                typeof decoded.sub !== "string"
                            ) {
                                throw error("Unauthorized", "Invalid refresh token");
                            }

                            const isBlacklisted = await record("dragonfly.blacklist.check", async () => {
                                return await dragonfly.get(`blacklist:refresh:${refreshToken.value}`);
                            });

                            if (isBlacklisted) {
                                throw error("Unauthorized", "Refresh token has been revoked");
                            }

                            const user = await record("database.users.findById", async () => {
                                return await db.query.users.findFirst({
                                    where: and(eq(users.id, decoded.sub!), isNull(users.deletedAt)),
                                    columns: {
                                        id: true,
                                    },
                                });
                            });

                            if (!user) {
                                throw error("Unauthorized", "User not found");
                            }

                            const oldRefreshTokenTTL = decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 0;
                            if (oldRefreshTokenTTL > 0) {
                                await record("dragonfly.blacklist.add", async () => {
                                    return await dragonfly.set(
                                        `blacklist:refresh:${refreshToken.value}`,
                                        "1",
                                        "EX",
                                        oldRefreshTokenTTL
                                    );
                                });
                            }

                            const newAccessToken = await jwt.sign({
                                sub: user.id,
                                iat: Math.floor(Date.now() / 1000),
                                exp: getExpireTimestamp(ACCESS_TOKEN_EXPIRATION),
                            });

                            const newRefreshToken = await jwt.sign({
                                sub: user.id,
                                iat: Math.floor(Date.now() / 1000),
                                exp: getExpireTimestamp(REFRESH_TOKEN_EXPIRATION),
                                jti: cuid(),
                            });

                            if (accessToken) {
                                accessToken.set({
                                    value: newAccessToken,
                                    httpOnly: true,
                                    maxAge: ACCESS_TOKEN_EXPIRATION,
                                    path: "/",
                                });
                            }

                            if (refreshToken) {
                                refreshToken.set({
                                    value: newRefreshToken,
                                    httpOnly: true,
                                    maxAge: REFRESH_TOKEN_EXPIRATION,
                                    path: "/",
                                });
                            }

                            return {
                                accessToken: newAccessToken,
                                refreshToken: newRefreshToken,
                            };
                        } catch (_error) {
                            throw error("Internal Server Error", "Failed to refresh token");
                        }
                    });
                },
                {
                    response: {
                        200: t.Object({
                            accessToken: t.String(),
                            refreshToken: t.String(),
                        }),
                        401: t.String(),
                        500: t.String(),
                    },
                    detail: {
                        description: "Refresh the access token",
                    },
                }
            )
            /* -------------------------------------------------------------------------- */
            .post(
                "/signout",
                async ({ error, cookie: { accessToken, refreshToken }, jwt }) => {
                    return await record("auth.signout", async () => {
                        try {
                            async function blacklistToken(
                                token: Cookie<string | undefined> | undefined,
                                type: "access" | "refresh"
                            ): Promise<void> {
                                if (!token?.value) return;

                                const decoded = await jwt.verify(token.value);
                                if (
                                    !decoded ||
                                    typeof decoded !== "object" ||
                                    !("exp" in decoded) ||
                                    typeof decoded.exp !== "number"
                                ) {
                                    return;
                                }

                                const ttl: number = decoded.exp - Math.floor(Date.now() / 1000);
                                if (ttl > 0) {
                                    await record("dragonfly.blacklist.add", async () =>
                                        dragonfly.set(`blacklist:${type}:${token.value}`, "1", "EX", ttl)
                                    );
                                }
                                token.remove();
                            }

                            await Promise.all([
                                blacklistToken(accessToken, "access"),
                                blacklistToken(refreshToken, "refresh"),
                            ]);

                            return "Successfully signed out";
                        } catch (_error) {
                            throw error("Internal Server Error", "Failed to sign out");
                        }
                    });
                },
                {
                    response: {
                        200: t.String(),
                        500: t.String(),
                    },
                    detail: {
                        description: "Sign out a user",
                    },
                }
            )
    )
);
