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
	"deleted_at" timestamp
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
ALTER TABLE "webhook" ADD CONSTRAINT "webhook_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE no action ON UPDATE no action;