import { env } from "@virtualqueue/environment";
import type { Config } from "drizzle-kit";

export default {
    schema: "./src/schema.ts",
    dialect: "postgresql",
    dbCredentials: {
        url: env.DATABASE_URL,
    },
    tablesFilter: ["virtualqueue_*"],
    out: "./migrations",
} satisfies Config;
