import { env } from "@virtualqueue/environment";
import { Elysia } from "elysia";
import { logger } from "./utils/logger";

logger.info("Starting API server...");

new Elysia().get("/", "Hello Elysia").listen(env.API_PORT);
