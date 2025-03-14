import swagger from "@elysiajs/swagger";
import { env } from "@virtualqueue/environment";
import { Elysia, t } from "elysia";
import type { Server } from "elysia/universal";
import { logger } from "#utils/logger";
import { useLoggerMiddleware } from "./middlewares/logger";

logger.info("Starting API server...");

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

export const api = new Elysia().use(useLoggerMiddleware()).use(swagger(swaggerConfig)).use(healthModule);

api.listen(env.API_PORT, (server: Server): void => {
    logger.info(`API server is running at ${server.url}`);
    logger.info(`API documentation is available at ${server.url}${swaggerConfig.path.replace(/^\//, "")}`);
});
