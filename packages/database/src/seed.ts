import { createId } from "@paralleldrive/cuid2";
import { env } from "@virtualqueue/environment";
import type { InferSelectModel } from "drizzle-orm";
import { type PostgresJsDatabase, drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

async function main() {
    const connection = postgres(env.DATABASE_URL);
    const db: PostgresJsDatabase<typeof schema> = drizzle(connection, { schema });

    const hashedPassword = await Bun.password.hash("password123");
    const users: InferSelectModel<typeof schema.users>[] = [];
    for (let i = 1; i <= 10; i++) {
        users.push({
            id: createId(),
            email: `user${i}@example.com`,
            password: hashedPassword,
            fullname: `Test User ${i}`,
            role: i === 1 ? "ADMIN" : i === 2 ? "SUPERADMIN" : "USER", // First as admin, second as superadmin, rest as regular users
            createdAt: new Date(),
            updatedAt: new Date(),
            photo: null,
            deletedAt: null,
        });
    }

    console.log("Seeding users...");
    await db.insert(schema.users).values(users).onConflictDoNothing({ target: schema.users.email });

    console.log("Database seeded successfully.");

    connection.end();
}

main();
