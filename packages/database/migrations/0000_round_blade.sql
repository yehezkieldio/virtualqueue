CREATE TYPE "public"."queue_item_status" AS ENUM('WAITING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."queue_priority" AS ENUM('VIP', 'REGULAR', 'PRIORITY');--> statement-breakpoint
CREATE TYPE "public"."roles" AS ENUM('USER', 'ADMIN', 'SUPERADMIN');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('ACTIVE', 'USED', 'EXPIRED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "event" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(1000),
	"location" varchar(255),
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"max_capacity" integer NOT NULL,
	"creator_id" varchar(24) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "event_dates_check" CHECK ("event"."end_date" > "event"."start_date")
);
--> statement-breakpoint
CREATE TABLE "queue_item" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"queue_id" varchar(24) NOT NULL,
	"ticket_id" varchar(24) NOT NULL,
	"user_id" varchar(24) NOT NULL,
	"queue_number" integer NOT NULL,
	"priority" "queue_priority" DEFAULT 'REGULAR' NOT NULL,
	"status" "queue_item_status" DEFAULT 'WAITING' NOT NULL,
	"estimated_time" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "queue_log" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"queue_id" varchar(24) NOT NULL,
	"queue_item_id" varchar(24) NOT NULL,
	"action" varchar(50) NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"details" jsonb
);
--> statement-breakpoint
CREATE TABLE "queue" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"event_id" varchar(24) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(500),
	"is_active" boolean DEFAULT true NOT NULL,
	"current_number" integer DEFAULT 0 NOT NULL,
	"sla_minutes" integer DEFAULT 15 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ticket" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"unique_code" uuid DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar(24) NOT NULL,
	"user_id" varchar(24) NOT NULL,
	"status" "ticket_status" DEFAULT 'ACTIVE' NOT NULL,
	"expires_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "ticket_unique_code_unique" UNIQUE("unique_code")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"photo" varchar(255),
	"role" "roles" DEFAULT 'USER' NOT NULL,
	"phone" varchar(20),
	"last_login" timestamp,
	"preferences" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "webhook" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"event_id" varchar(24) NOT NULL,
	"url" varchar(500) NOT NULL,
	"secret" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_item" ADD CONSTRAINT "queue_item_queue_id_queue_id_fk" FOREIGN KEY ("queue_id") REFERENCES "public"."queue"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_item" ADD CONSTRAINT "queue_item_ticket_id_ticket_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."ticket"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_item" ADD CONSTRAINT "queue_item_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_log" ADD CONSTRAINT "queue_log_queue_id_queue_id_fk" FOREIGN KEY ("queue_id") REFERENCES "public"."queue"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_log" ADD CONSTRAINT "queue_log_queue_item_id_queue_item_id_fk" FOREIGN KEY ("queue_item_id") REFERENCES "public"."queue_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue" ADD CONSTRAINT "queue_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook" ADD CONSTRAINT "webhook_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_creator_id_idx" ON "event" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "event_name_idx" ON "event" USING btree ("name");--> statement-breakpoint
CREATE INDEX "event_start_date_idx" ON "event" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "event_end_date_idx" ON "event" USING btree ("end_date");--> statement-breakpoint
CREATE INDEX "event_is_active_idx" ON "event" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "event_deleted_at_idx" ON "event" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "event_date_range_idx" ON "event" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE INDEX "queue_item_queue_id_idx" ON "queue_item" USING btree ("queue_id");--> statement-breakpoint
CREATE INDEX "queue_item_ticket_id_idx" ON "queue_item" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "queue_item_user_id_idx" ON "queue_item" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "queue_item_status_idx" ON "queue_item" USING btree ("status");--> statement-breakpoint
CREATE INDEX "queue_item_priority_idx" ON "queue_item" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "queue_item_queue_status_idx" ON "queue_item" USING btree ("queue_id","status");--> statement-breakpoint
CREATE INDEX "queue_item_queue_priority_idx" ON "queue_item" USING btree ("queue_id","priority");--> statement-breakpoint
CREATE INDEX "queue_item_queue_number_idx" ON "queue_item" USING btree ("queue_id","queue_number");--> statement-breakpoint
CREATE INDEX "queue_log_queue_id_idx" ON "queue_log" USING btree ("queue_id");--> statement-breakpoint
CREATE INDEX "queue_log_queue_item_id_idx" ON "queue_log" USING btree ("queue_item_id");--> statement-breakpoint
CREATE INDEX "queue_log_timestamp_idx" ON "queue_log" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "queue_log_action_idx" ON "queue_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "queue_event_id_idx" ON "queue" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "queue_is_active_idx" ON "queue" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "queue_name_idx" ON "queue" USING btree ("name");--> statement-breakpoint
CREATE INDEX "queue_deleted_at_idx" ON "queue" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "ticket_event_id_idx" ON "ticket" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "ticket_user_id_idx" ON "ticket" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ticket_status_idx" ON "ticket" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ticket_expires_at_idx" ON "ticket" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "ticket_deleted_at_idx" ON "ticket" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_unique_code_idx" ON "ticket" USING btree ("unique_code");--> statement-breakpoint
CREATE INDEX "ticket_event_user_idx" ON "ticket" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE INDEX "ticket_event_status_idx" ON "ticket" USING btree ("event_id","status");--> statement-breakpoint
CREATE INDEX "name_idx" ON "user" USING btree ("name");--> statement-breakpoint
CREATE INDEX "role_idx" ON "user" USING btree ("role");--> statement-breakpoint
CREATE INDEX "created_at_idx" ON "user" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "updated_at_idx" ON "user" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "deleted_at_idx" ON "user" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "email_idx" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "webhook_event_id_idx" ON "webhook" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "webhook_is_active_idx" ON "webhook" USING btree ("is_active");--> statement-breakpoint
CREATE MATERIALIZED VIEW "public"."popular_events" AS (select "event_id", cast(count(*) as int) as "ticket_count" from "ticket" group by "ticket"."event_id" order by "ticket_count" desc);--> statement-breakpoint
CREATE MATERIALIZED VIEW "public"."queue_analytics" AS (select "queue_id", 
                avg(extract(epoch from ("updated_at" - "created_at")))/60
             as "avg_wait_minutes", 
                count(case when "status" = 'COMPLETED' then 1 end)
             as "completed_count", 
                count(case when "status" = 'CANCELLED' then 1 end)
             as "cancelled_count" from "queue_item" group by "queue_item"."queue_id");