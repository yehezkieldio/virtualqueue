import { env } from "@virtualqueue/environment";
import { type PostgresJsDatabase, drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
    connection: postgres.Sql | undefined;
};

export const connection: postgres.Sql = globalForDb.connection ?? postgres(env.DATABASE_URL);
if (env.NODE_ENV !== "production") globalForDb.connection = connection;

export const db: PostgresJsDatabase<typeof schema> = drizzle(connection, { schema });
export * from "drizzle-orm";
