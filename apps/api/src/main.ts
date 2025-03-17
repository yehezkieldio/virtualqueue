import { ElysiaOpenTelemetryOptions, opentelemetry } from "@elysiajs/opentelemetry";
import swagger from "@elysiajs/swagger";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { env } from "@virtualqueue/environment";
import { Elysia, t } from "elysia";
import type { Server } from "elysia/universal";
import { logger } from "#utils/logger";
import { startMetrics, useMetricsMiddleware } from "#utils/metrics";
import { useLoggerMiddleware } from "./middlewares/logger";
import { useResponseMapperMiddleware } from "./middlewares/response-mapper";
import { usersModule } from "./modules/users";
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
logger.info("Starting API server...");
startMetrics();

const healthModule = new Elysia().get(
    "/health",
    () => {
        return {
            status: "ok",
        };
    },
    {
        response: {
            200: t.Object({
                status: t.String({
                    default: "ok",
                    description: "Status of the API, which should always be 'ok'.",
                }),
            }),
        },
        detail: {
            description: "View the health status of the API.",
            tags: ["General"],
        },
    }
);

const metricsModule = new Elysia().get("/metrics", () => {
    return fetch("http://localhost:9464/metrics").then((res) => res.text());
});

const swaggerConfig = {
    path: "/reference",
    documentation: {
        info: {
            title: "virtualqueue",
            description: "",
            version: "0.0.0",
        },
        tags: [
            {
                name: "General",
                description: "General endpoints, such as health checks.",
            },
            {
                name: "Users",
                description: "Endpoints for managing users.",
            },
        ],
    },
};

const openTelemetryConfig: ElysiaOpenTelemetryOptions = {
    // spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter())],
    serviceName: "virtualqueue-api",
    spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter({
        // url: 'http://localhost:4318/v1/traces', // Tempo OTLP HTTP endpoint
        url: "grpc://tempo:4317"
    }))],
};

const api = new Elysia()
    .use(useLoggerMiddleware())
    .use(useResponseMapperMiddleware())
    .use(opentelemetry(openTelemetryConfig))
    .use(swagger(swaggerConfig))
    .use(healthModule)
    .use(metricsModule)
    .use(usersModule)
    .use(useMetricsMiddleware());

api.listen(env.API_PORT, (server: Server): void => {
    logger.info(`API server is running at ${server.url}`);
    logger.info(`API documentation is available at ${server.url}${swaggerConfig.path.replace(/^\//, "")}`);
});
