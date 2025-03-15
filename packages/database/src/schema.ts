import { sql } from "drizzle-orm";
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
import { cuid } from "./cuid";

export const rolesEnum = pgEnum("roles", ["USER", "ADMIN", "SUPERADMIN"]);
export type RolesType = (typeof rolesEnum.enumValues)[number];

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

/* -------------------------------------------------------------------------- */
/*                                    USERS                                   */
/* -------------------------------------------------------------------------- */

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
        index("user_fullname_idx").on(table.fullname),
        index("user_role_idx").on(table.role),
        index("user_created_at_idx").on(table.createdAt),
        index("user_updated_at_idx").on(table.updatedAt),
        index("user_deleted_at_idx").on(table.deletedAt),
        index("user_last_login_idx").on(table.lastLogin),
    ]
);

/* -------------------------------------------------------------------------- */
/*                                   EVENTS                                   */
/* -------------------------------------------------------------------------- */

export const events = pgTable(
    "event",
    {
        id: primaryId,
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
        ...timestamps,
    },
    (table) => [
        index("event_creator_id_idx").on(table.creatorId),
        index("event_name_idx").on(table.name),
        index("event_start_date_idx").on(table.startDate),
        index("event_end_date_idx").on(table.endDate),
        index("event_is_active_idx").on(table.isActive),
        index("event_created_at_idx").on(table.createdAt),
        index("event_updated_at_idx").on(table.updatedAt),
        index("event_deleted_at_idx").on(table.deletedAt),
        index("event_date_range_idx").on(table.startDate, table.endDate),
        check("event_dates_check", sql`${table.endDate} > ${table.startDate}`),
    ]
);

/* -------------------------------------------------------------------------- */
/*                                   TICKETS                                  */
/* -------------------------------------------------------------------------- */

export const ticketStatusEnum = pgEnum("ticket_status", ["ACTIVE", "USED", "EXPIRED", "CANCELLED"]);
export type TicketStatusType = (typeof ticketStatusEnum.enumValues)[number];

export const tickets = pgTable(
    "ticket",
    {
        id: primaryId,
        uniqueCode: uuid("unique_code").defaultRandom().notNull().unique(),
        eventId: varchar("event_id", { length: 24 })
            .notNull()
            .references(() => events.id),
        userId: varchar("user_id", { length: 24 })
            .notNull()
            .references(() => users.id),
        status: ticketStatusEnum("status").notNull().default("ACTIVE"),
        expiresAt: timestamp("expires_at"),
        metadata: jsonb("metadata"),
        ...timestamps,
    },
    (table) => [
        index("ticket_event_id_idx").on(table.eventId),
        index("ticket_user_id_idx").on(table.userId),
        index("ticket_status_idx").on(table.status),
        index("ticket_expires_at_idx").on(table.expiresAt),
        index("ticket_created_at_idx").on(table.createdAt),
        index("ticket_updated_at_idx").on(table.updatedAt),
        index("ticket_deleted_at_idx").on(table.deletedAt),
        index("ticket_event_user_idx").on(table.eventId, table.userId),
        index("ticket_event_status_idx").on(table.eventId, table.status),
        uniqueIndex("ticket_unique_code_idx").on(table.uniqueCode),
    ]
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

/* -------------------------------------------------------------------------- */
/*                                   QUEUES                                   */
/* -------------------------------------------------------------------------- */

export const queues = pgTable(
    "queue",
    {
        id: primaryId,
        eventId: varchar("event_id", { length: 24 })
            .notNull()
            .references(() => events.id),
        name: varchar("name", { length: 255 }).notNull(),
        description: varchar("description", { length: 500 }),
        isActive: boolean("is_active").notNull().default(true),
        currentNumber: integer("current_number").notNull().default(0),
        slaMinutes: integer("sla_minutes").notNull().default(15),
        metadata: jsonb("metadata"),
        ...timestamps,
    },
    (table) => [
        index("queue_event_id_idx").on(table.eventId),
        index("queue_is_active_idx").on(table.isActive),
        index("queue_name_idx").on(table.name),
        index("queue_created_at_idx").on(table.createdAt),
        index("queue_updated_at_idx").on(table.updatedAt),
        index("queue_deleted_at_idx").on(table.deletedAt),
    ]
);

/* -------------------------------------------------------------------------- */
/*                                 QUEUE ITEMS                                */
/* -------------------------------------------------------------------------- */

export const queueItemStatusEnum = pgEnum("queue_item_status", ["WAITING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);
export type QueueItemStatusType = (typeof queueItemStatusEnum.enumValues)[number];

export const queueItems = pgTable(
    "queue_item",
    {
        id: primaryId,
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
        priority: queuePriorityEnum("priority").notNull().default("REGULAR"),
        status: queueItemStatusEnum("status").notNull().default("WAITING"),
        estimatedTime: timestamp("estimated_time"),
        startedAt: timestamp("started_at"),
        completedAt: timestamp("completed_at"),
        metadata: jsonb("metadata"),
        ...timestamps,
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
        index("queue_item_started_at_idx").on(table.startedAt),
        index("queue_item_completed_at_idx").on(table.completedAt),
        index("queue_item_created_at_idx").on(table.createdAt),
        index("queue_item_updated_at_idx").on(table.updatedAt),
        index("queue_item_deleted_at_idx").on(table.deletedAt),
    ]
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

/* -------------------------------------------------------------------------- */
/*                                 QUEUE LOGS                                 */
/* -------------------------------------------------------------------------- */

export const queueLogs = pgTable(
    "queue_log",
    {
        id: primaryId,
        queueId: varchar("queue_id", { length: 24 })
            .notNull()
            .references(() => queues.id),
        queueItemId: varchar("queue_item_id", { length: 24 })
            .notNull()
            .references(() => queueItems.id),
        action: varchar("action", { length: 50 }).notNull(),
        timestamp: timestamp("timestamp").defaultNow().notNull(),
        details: jsonb("details"),
        ...timestamps,
    },
    (table) => [
        index("queue_log_queue_id_idx").on(table.queueId),
        index("queue_log_queue_item_id_idx").on(table.queueItemId),
        index("queue_log_timestamp_idx").on(table.timestamp),
        index("queue_log_action_idx").on(table.action),
        index("queue_log_created_at_idx").on(table.createdAt),
        index("queue_log_updated_at_idx").on(table.updatedAt),
        index("queue_log_deleted_at_idx").on(table.deletedAt),
    ]
);

/* -------------------------------------------------------------------------- */
/*                                  WEBHOOKS                                  */
/* -------------------------------------------------------------------------- */

export const webhooks = pgTable(
    "webhook",
    {
        id: primaryId,
        eventId: varchar("event_id", { length: 24 })
            .notNull()
            .references(() => events.id),
        url: varchar("url", { length: 500 }).notNull(),
        secret: varchar("secret", { length: 255 }).notNull(),
        isActive: boolean("is_active").notNull().default(true),
        events: jsonb("events").$type<string[]>(),
        metadata: jsonb("metadata"),
        ...timestamps,
    },
    (table) => [
        index("webhook_event_id_idx").on(table.eventId),
        index("webhook_is_active_idx").on(table.isActive),
        index("webhook_url_idx").on(table.url),
        index("webhook_secret_idx").on(table.secret),
        index("webhook_created_at_idx").on(table.createdAt),
        index("webhook_updated_at_idx").on(table.updatedAt),
        index("webhook_deleted_at_idx").on(table.deletedAt),
    ]
);

/* -------------------------------------------------------------------------- */

export const table = {
    users,
    events,
    tickets,
    queues,
    queueItems,
    queueLogs,
    webhooks,
} as const;

export const materializedViews = {
    popularEvents,
    queueAnalytics,
} as const;

export type Table = typeof table;
export type MaterializedView = typeof materializedViews;
