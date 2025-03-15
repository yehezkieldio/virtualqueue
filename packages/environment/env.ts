import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

process.env = {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV ?? "development",
};

export const env = createEnv({
    server: {
        NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
        DATABASE_URL: z.string().url(),
        API_HOST: z.string().default("localhost"),
        API_PORT: z.string().default("3001"),
        TRACE_LOG: z.coerce.boolean().default(false),
        OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().default("http://localhost:4318"),
        OTEL_EXPORTER_OTLP_PROTOCOL: z.string().default("http/protobuf"),
        OTEL_RESOURCE_ATTRIBUTES: z.string().default("virtualqueue-api,service.version=0.0.0"),
    },
    clientPrefix: "PUBLIC_",
    client: {},
    runtimeEnv: process.env,
    emptyStringAsUndefined: true,
});

export const isProduction: boolean = env.NODE_ENV === "production";
