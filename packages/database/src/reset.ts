import { env } from "@virtualqueue/environment";
import { type PostgresJsDatabase, drizzle } from "drizzle-orm/postgres-js";
import { reset } from "drizzle-seed";
import postgres from "postgres";
import * as schema from "./schema";

async function main() {
    const connection = postgres(env.DATABASE_URL);
    const db: PostgresJsDatabase<typeof schema> = drizzle(connection, { schema });

    await reset(db, schema);
    console.log("Database reset successfully.");

    connection.end();
}

main();
