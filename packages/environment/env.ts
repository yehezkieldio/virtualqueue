import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

process.env = {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV ?? "development",
};

export const env = createEnv({
    server: {
        NODE_ENV: z.enum(["development", "production"]).default("development"),
        DATABASE_URL: z.string().url(),
        API_HOST: z.string().default("localhost"),
        API_PORT: z.string().default("3001"),
    },
    clientPrefix: "PUBLIC_",
    client: {},
    runtimeEnv: process.env,
    emptyStringAsUndefined: true,
});

export const isProduction: boolean = env.NODE_ENV === "production";
