import { env } from "@virtualqueue/environment";
import { type PostgresJsDatabase, drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Global type definition to store connection and initialization flag
const globalForDb = globalThis as unknown as {
    connection: postgres.Sql | undefined;
    isConnectionVerified: boolean;
};

export const connection: postgres.Sql = globalForDb.connection ?? postgres(env.DATABASE_URL);
if (env.NODE_ENV !== "production") globalForDb.connection = connection;

export const db: PostgresJsDatabase<typeof schema> = drizzle(connection, { schema });

if (!globalForDb.isConnectionVerified) {
    try {
        await db.$count(schema.users);
        globalForDb.isConnectionVerified = true;
    } catch (error) {
        console.error("Could not connect to the database. Please check your connection string.", error);
        process.exit(1);
    }
}

export * from "drizzle-orm";
