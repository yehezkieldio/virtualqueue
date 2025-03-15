import { env } from "@virtualqueue/environment";
import Redis from "ioredis";

const globalForDragonfly = globalThis as unknown as {
    redis: Redis | undefined;
};

const dragonflyClient: Redis =
    globalForDragonfly.redis ??
    new Redis({
        host: env.DRAGONFLY_HOST,
        port: env.DRAGONFLY_PORT,
        enableReadyCheck: true,
        lazyConnect: true,
    });
if (env.NODE_ENV !== "production") globalForDragonfly.redis = dragonflyClient;

export const dragonfly: Redis = dragonflyClient;
