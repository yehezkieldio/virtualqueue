import { parseArgs } from "node:util";
import { createId } from "@paralleldrive/cuid2";
import { env } from "@virtualqueue/environment";
import type { InferSelectModel } from "drizzle-orm";
import { type PostgresJsDatabase, drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const { values } = parseArgs({
    args: Bun.argv,
    options: {
        large: {
            type: "boolean",
        },
    },
    strict: true,
    allowPositionals: true,
});

async function main() {
    const connection = postgres(env.DATABASE_URL);
    const db: PostgresJsDatabase<typeof schema> = drizzle(connection, { schema });

    const hashedPassword = await Bun.password.hash("password123");
    const users: InferSelectModel<typeof schema.users>[] = [];

    const userCount = values.large ? 1000 : 10;

    console.log(`Seeding ${userCount} users...`);

    for (let i = 1; i <= userCount; i++) {
        const generateIndonesianPhoneNumber = () => {
            const randomNumber = Math.floor(Math.random() * 1000000000);
            return `+62${randomNumber}`;
        };

        const generateFullName = () => {
            const firstNames = ["John", "Jane", "Alice", "Bob", "Charlie"];
            const lastNames = ["Doe", "Smith", "Johnson", "Brown", "Williams"];
            const randomFirstName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const randomLastName = lastNames[Math.floor(Math.random() * lastNames.length)];
            return `${randomFirstName} ${randomLastName} ${i}`;
        };

        users.push({
            id: createId(),
            email: `user${i}@example.com`,
            password: hashedPassword,
            fullname: `${generateFullName()}`,
            role: i === 1 ? "ADMIN" : i === 2 ? "SUPERADMIN" : "USER",
            createdAt: new Date(),
            updatedAt: new Date(),
            photo: null,
            lastLogin: null,
            phoneNumber: generateIndonesianPhoneNumber(),
            deletedAt: null,
            preferences: null,
        });
    }

    const batchSize = 100;
    for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        await db.insert(schema.users).values(batch).onConflictDoNothing({ target: schema.users.email });
        console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(users.length / batchSize)}`);
    }

    console.log("Database seeded successfully.");
    connection.end();
}

main();
