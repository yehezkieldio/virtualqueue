import { createId } from "@paralleldrive/cuid2";
import { type SQL, and, isNull, relations, sql } from "drizzle-orm";
import {
    boolean,
    check,
    index,
    integer,
    jsonb,
    pgEnum,
    pgMaterializedView,
    pgTable,
    timestamp,
    uniqueIndex,
    uuid,
    varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-typebox";

export const notDeleted = <T extends { deletedAt: unknown }>(table: T) => isNull(table.deletedAt as unknown as SQL);

export const withNotDeleted = <T extends { deletedAt: unknown }>(table: T, conditions?: SQL[]) =>
    conditions ? and(notDeleted(table), ...conditions) : notDeleted(table);

export const roles = pgEnum("roles", ["USER", "ADMIN", "SUPERADMIN"]);
export type RolesType = (typeof roles.enumValues)[number];

export const ticketStatus = pgEnum("ticket_status", ["ACTIVE", "USED", "EXPIRED", "CANCELLED"]);
export const queuePriority = pgEnum("queue_priority", ["VIP", "REGULAR", "PRIORITY"]);

export const users = pgTable(
    "user",
    {
        id: varchar("id", { length: 24 })
            .$defaultFn(() => createId())
            .primaryKey(),
        email: varchar("email", { length: 255 }).notNull().unique(),
        password: varchar("password", { length: 255 }).notNull(),
        fullname: varchar("name", { length: 255 }).notNull(),
        photo: varchar("photo", { length: 255 }),
        role: roles("role").notNull().default("USER"),
        phone: varchar("phone", { length: 20 }),
        lastLogin: timestamp("last_login"),
        preferences: jsonb("preferences"),
        createdAt: timestamp("created_at").defaultNow(),
        updatedAt: timestamp("updated_at").defaultNow(),
        deletedAt: timestamp("deleted_at"),
    },
    (table) => [
        index("name_idx").on(table.fullname),
        index("role_idx").on(table.role),
        index("created_at_idx").on(table.createdAt),
        index("updated_at_idx").on(table.updatedAt),
        index("deleted_at_idx").on(table.deletedAt),
        uniqueIndex("email_idx").on(table.email),
    ]
);

export const selectUserSchema = createSelectSchema(users);
export const insertUserSchema = createInsertSchema(users);
export const updateUserSchema = createUpdateSchema(users);

export const events = pgTable(
    "event",
    {
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
    },
    (table) => [
        index("event_creator_id_idx").on(table.creatorId),
        index("event_name_idx").on(table.name),
        index("event_start_date_idx").on(table.startDate),
        index("event_end_date_idx").on(table.endDate),
        index("event_is_active_idx").on(table.isActive),
        index("event_deleted_at_idx").on(table.deletedAt),
        index("event_date_range_idx").on(table.startDate, table.endDate),
        check("event_dates_check", sql`${table.endDate} > ${table.startDate}`),
    ]
);

export const tickets = pgTable(
    "ticket",
    {
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
    },
    (table) => [
        index("ticket_event_id_idx").on(table.eventId),
        index("ticket_user_id_idx").on(table.userId),
        index("ticket_status_idx").on(table.status),
        index("ticket_expires_at_idx").on(table.expiresAt),
        index("ticket_deleted_at_idx").on(table.deletedAt),
        uniqueIndex("ticket_unique_code_idx").on(table.uniqueCode),
        index("ticket_event_user_idx").on(table.eventId, table.userId),
        index("ticket_event_status_idx").on(table.eventId, table.status),
    ]
);

export const queues = pgTable(
    "queue",
    {
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
    },
    (table) => [
        index("queue_event_id_idx").on(table.eventId),
        index("queue_is_active_idx").on(table.isActive),
        index("queue_name_idx").on(table.name),
        index("queue_deleted_at_idx").on(table.deletedAt),
    ]
);

export const usersRelations = relations(users, ({ many }) => ({
    events: many(events, { relationName: "creator" }),
    tickets: many(tickets),
    queueItems: many(queueItems),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
    creator: one(users, {
        fields: [events.creatorId],
        references: [users.id],
    }),
    tickets: many(tickets),
    queues: many(queues),
}));

export const queueItemStatusEnum = pgEnum("queue_item_status", ["WAITING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);

export const queueItems = pgTable(
    "queue_item",
    {
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
    },
    (table) => [
        index("queue_item_queue_id_idx").on(table.queueId),
        index("queue_item_ticket_id_idx").on(table.ticketId),
        index("queue_item_user_id_idx").on(table.userId),
        index("queue_item_status_idx").on(table.status),
        index("queue_item_priority_idx").on(table.priority),
        index("queue_item_queue_status_idx").on(table.queueId, table.status),
        index("queue_item_queue_priority_idx").on(table.queueId, table.priority),
        index("queue_item_queue_number_idx").on(table.queueId, table.queueNumber),
    ]
);

export const queueLogs = pgTable(
    "queue_log",
    {
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
    },
    (table) => [
        index("queue_log_queue_id_idx").on(table.queueId),
        index("queue_log_queue_item_id_idx").on(table.queueItemId),
        index("queue_log_timestamp_idx").on(table.timestamp),
        index("queue_log_action_idx").on(table.action),
    ]
);

export const webhooks = pgTable(
    "webhook",
    {
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
    },
    (table) => [index("webhook_event_id_idx").on(table.eventId), index("webhook_is_active_idx").on(table.isActive)]
);

export const queueAnalytics = pgMaterializedView("queue_analytics").as((qb) =>
    qb
        .select({
            queueId: queueItems.queueId,
            avgWaitTime: sql<number>`
                avg(extract(epoch from (${queueItems.updatedAt} - ${queueItems.createdAt})))/60
            `.as("avg_wait_minutes"),
            totalCompleted: sql<number>`
                count(case when ${queueItems.status} = 'COMPLETED' then 1 end)
            `.as("completed_count"),
            totalCancelled: sql<number>`
                count(case when ${queueItems.status} = 'CANCELLED' then 1 end)
            `.as("cancelled_count"),
        })
        .from(queueItems)
        .groupBy(queueItems.queueId)
);

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
