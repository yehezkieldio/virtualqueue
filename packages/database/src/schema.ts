import { index, jsonb, pgEnum, pgTable, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { cuid } from "./cuid";

export const rolesEnum = pgEnum("roles", ["USER", "ADMIN", "SUPERADMIN"]);
export type RolesType = (typeof rolesEnum.enumValues)[number];

export const ticketStatusEnum = pgEnum("ticket_status", ["ACTIVE", "USED", "EXPIRED", "CANCELLED"]);
export type TicketStatusType = (typeof ticketStatusEnum.enumValues)[number];

export const queuePriorityEnum = pgEnum("queue_priority", ["VIP", "REGULAR", "PRIORITY"]);
export type QueuePriorityType = (typeof queuePriorityEnum.enumValues)[number];

const timestamps = {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow(),
    deletedAt: timestamp("deleted_at"),
};

const primaryId = varchar("id", { length: 24 })
    .$defaultFn((): string => cuid())
    .primaryKey();

export const users = pgTable(
    "user",
    {
        id: primaryId,
        email: varchar("email", { length: 255 }).notNull().unique(),
        password: varchar("password", { length: 255 }).notNull(),
        fullname: varchar("name", { length: 255 }).notNull(),
        role: rolesEnum("role").notNull().default("USER"),
        photo: varchar("photo", { length: 255 }),
        phoneNumber: varchar("phone", { length: 20 }),
        lastLogin: timestamp("last_login"),
        preferences: jsonb("preferences").$type<string[]>(),
        ...timestamps,
    },
    (table) => [
        uniqueIndex("email_idx").on(table.email),
        index("fullname_idx").on(table.fullname),
        index("role_idx").on(table.role),
        index("created_at_idx").on(table.createdAt),
        index("updated_at_idx").on(table.updatedAt),
        index("deleted_at_idx").on(table.deletedAt),
        index("last_login_idx").on(table.lastLogin),
    ]
);

export const table = {
    users,
} as const;

export type Table = typeof table;
