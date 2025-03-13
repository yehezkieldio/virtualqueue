import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import {
    boolean,
    integer,
    jsonb,
    pgEnum,
    pgMaterializedView,
    pgTable,
    timestamp,
    uuid,
    varchar,
} from "drizzle-orm/pg-core";

export const roles = pgEnum("roles", ["USER", "ADMIN", "SUPERADMIN"]);
export const ticketStatus = pgEnum("ticket_status", ["ACTIVE", "USED", "EXPIRED", "CANCELLED"]);
export const queuePriority = pgEnum("queue_priority", ["VIP", "REGULAR", "PRIORITY"]);

export const users = pgTable("user", {
    id: varchar("id", { length: 24 })
        .$defaultFn(() => createId())
        .primaryKey(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    password: varchar("password", { length: 255 }).notNull(),
    fullname: varchar("name", { length: 255 }).notNull(),
    photo: varchar("photo", { length: 255 }),
    role: roles("role").notNull().default("USER"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    deletedAt: timestamp("deleted_at"),
});

export const events = pgTable("event", {
    id: varchar("id", { length: 24 })
        .$defaultFn(() => createId())
        .primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    description: varchar("description", { length: 1000 }),
    location: varchar("location", { length: 255 }),
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date").notNull(),
    maxCapacity: integer("max_capacity").notNull(),
    creatorId: varchar("creator_id", { length: 24 })
        .notNull()
        .references(() => users.id),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    deletedAt: timestamp("deleted_at"),
});

export const tickets = pgTable("ticket", {
    id: varchar("id", { length: 24 })
        .$defaultFn(() => createId())
        .primaryKey(),
    uniqueCode: uuid("unique_code").defaultRandom().notNull().unique(),
    eventId: varchar("event_id", { length: 24 })
        .notNull()
        .references(() => events.id),
    userId: varchar("user_id", { length: 24 })
        .notNull()
        .references(() => users.id),
    status: ticketStatus("status").notNull().default("ACTIVE"),
    expiresAt: timestamp("expires_at"),
    metadata: jsonb("metadata"), // For storing any additional ticket information
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    deletedAt: timestamp("deleted_at"),
});

export const queues = pgTable("queue", {
    id: varchar("id", { length: 24 })
        .$defaultFn(() => createId())
        .primaryKey(),
    eventId: varchar("event_id", { length: 24 })
        .notNull()
        .references(() => events.id),
    name: varchar("name", { length: 255 }).notNull(),
    description: varchar("description", { length: 500 }),
    isActive: boolean("is_active").notNull().default(true),
    currentNumber: integer("current_number").notNull().default(0),
    slaMinutes: integer("sla_minutes").notNull().default(15),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    deletedAt: timestamp("deleted_at"),
});

export const queueItemStatusEnum = pgEnum("queue_item_status", ["WAITING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);

export const queueItems = pgTable("queue_item", {
    id: varchar("id", { length: 24 })
        .$defaultFn(() => createId())
        .primaryKey(),
    queueId: varchar("queue_id", { length: 24 })
        .notNull()
        .references(() => queues.id),
    ticketId: varchar("ticket_id", { length: 24 })
        .notNull()
        .references(() => tickets.id),
    userId: varchar("user_id", { length: 24 })
        .notNull()
        .references(() => users.id),
    queueNumber: integer("queue_number").notNull(),
    priority: queuePriority("priority").notNull().default("REGULAR"),
    status: queueItemStatusEnum("status").notNull().default("WAITING"),
    estimatedTime: timestamp("estimated_time"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export const queueLogs = pgTable("queue_log", {
    id: varchar("id", { length: 24 })
        .$defaultFn(() => createId())
        .primaryKey(),
    queueId: varchar("queue_id", { length: 24 })
        .notNull()
        .references(() => queues.id),
    queueItemId: varchar("queue_item_id", { length: 24 })
        .notNull()
        .references(() => queueItems.id),
    action: varchar("action", { length: 50 }).notNull(),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
    details: jsonb("details"),
});

export const webhooks = pgTable("webhook", {
    id: varchar("id", { length: 24 })
        .$defaultFn(() => createId())
        .primaryKey(),
    eventId: varchar("event_id", { length: 24 })
        .notNull()
        .references(() => events.id),
    url: varchar("url", { length: 500 }).notNull(), // Endpoint penerima
    secret: varchar("secret", { length: 255 }).notNull(), // Digunakan untuk validasi request
    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at").defaultNow(),
});

export const popularEvents = pgMaterializedView("popular_events").as((qb) =>
    qb
        .select({
            eventId: tickets.eventId,
            ticketCount: sql<number>`cast(count(*) as int)`.as("ticket_count"),
        })
        .from(tickets)
        .groupBy(tickets.eventId)
        .orderBy(sql`${sql<number>`cast(count(*) as int)`.as("ticket_count")} desc`)
);
