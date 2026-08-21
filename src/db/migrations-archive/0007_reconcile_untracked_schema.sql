-- Reconciles the schema with the migration history.
--
-- The deployed databases were built with `drizzle-kit push`, which writes
-- schema.ts straight to the database and records nothing, so nine tables the
-- application depends on — api_keys, app_notifications, integration_settings,
-- linked_devices, notification_logs, notification_queue, notification_rules,
-- user_refresh_tokens, webhook_subscriptions — plus several enums, columns and
-- indexes existed only in environments that had been pushed to. Migrating from
-- an empty database produced a schema the application could not run on, and
-- migration 0002 failed outright because it indexes notification_queue.
--
-- Every statement here is idempotent: an environment that was pushed to already
-- has these objects and skips them, while a database built from zero gets them.
--
-- Deliberately NOT included: dropping users.password. The column is unused since
-- the move to Keycloak but may still hold data, so removing it belongs in its
-- own reviewed migration.

DO $$ BEGIN
  CREATE TYPE "public"."assignment_state" AS ENUM('pending approval', 'assigned', 'overdue', 'requested', 'returned');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."notification_category" AS ENUM('HARDWARE_LIFECYCLE', 'OPERATIONAL', 'SECURITY', 'FINANCIAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."notification_channel" AS ENUM('in_app', 'email', 'teams');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."notification_event_type" AS ENUM('WARRANTY_EXPIRY', 'SOFTWARE_LICENSE_RENEWAL', 'RETURN_OVERDUE', 'MAINTENANCE_COMPLETED', 'DISPOSAL_REQUEST', 'DISPOSAL_APPROVED', 'DISPOSAL_REJECTED', 'ROLE_CHANGE', 'ASSIGNMENT_PENDING', 'ASSIGNMENT_ACCEPTED', 'ASSIGNMENT_DECLINED', 'ASSET_DEFECTIVE_REPORTED', 'PENDING_ACCEPTANCE', 'REMINDER_24H', 'REMINDER_48H', 'UPCOMING_RETURN', 'RETURN_REQUESTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."notification_log_status" AS ENUM('sent', 'failed', 'pending');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."notification_queue_event_type" AS ENUM('PENDING_ACCEPTANCE', 'REMINDER_24H', 'REMINDER_48H', 'REMINDER_72H_ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
ALTER TYPE "public"."asset_status" ADD VALUE IF NOT EXISTS 'Returned';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"key_hash" varchar(64) NOT NULL,
	"key_prefix" varchar(16) NOT NULL,
	"key_suffix" varchar(4) NOT NULL,
	"scopes" text[] DEFAULT ARRAY['read:assets'] NOT NULL,
	"created_by_id" uuid NOT NULL,
	"last_used_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"is_revoked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "app_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"target_url" varchar(500),
	"is_read" boolean DEFAULT false NOT NULL,
	"event_type" "notification_event_type" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "integration_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"resend_api_key" text,
	"teams_webhook_url" text,
	"smtp_host" varchar(255),
	"smtp_port" integer,
	"smtp_user" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "single_row_check" CHECK ("integration_settings"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "linked_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"device_name" varchar(255) DEFAULT 'Unknown Device' NOT NULL,
	"device_os" varchar(100),
	"device_model" varchar(100),
	"jwt_id" varchar(64) NOT NULL,
	"last_active_at" timestamp with time zone,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_revoked" boolean DEFAULT false NOT NULL,
	CONSTRAINT "linked_devices_jwt_id_unique" UNIQUE("jwt_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"notification_id" uuid,
	"user_id" uuid,
	"target_url" varchar(500),
	"event_type" "notification_event_type" NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"status" "notification_log_status" NOT NULL,
	"error_message" text,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_type" "notification_queue_event_type" NOT NULL,
	"assignment_id" integer NOT NULL,
	"recipient_id" uuid NOT NULL,
	"is_processed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"rule_key" varchar(100) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"category" "notification_category" NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"threshold_days" integer,
	"channel_in_app" boolean DEFAULT true NOT NULL,
	"channel_email" boolean DEFAULT true NOT NULL,
	"channel_teams" boolean DEFAULT false NOT NULL,
	"updated_by_id" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_rules_rule_key_unique" UNIQUE("rule_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_refresh_tokens" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"refresh_token" text NOT NULL,
	"access_token" text,
	"id_token" text,
	"access_token_expires" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "webhook_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"url" text NOT NULL,
	"events" jsonb NOT NULL,
	"secret" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "asset_purchases" ALTER COLUMN "currency_code" SET DEFAULT 'LKR';--> statement-breakpoint
ALTER TABLE "asset_assignments" ADD COLUMN IF NOT EXISTS "state" "assignment_state" DEFAULT 'pending approval' NOT NULL;--> statement-breakpoint
ALTER TABLE "asset_purchases" ADD COLUMN IF NOT EXISTS "exchange_rate" numeric(15, 6) DEFAULT '1';--> statement-breakpoint
ALTER TABLE "software_licenses" ADD COLUMN IF NOT EXISTS "asset_id" uuid;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "app_notifications" ADD CONSTRAINT "app_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "linked_devices" ADD CONSTRAINT "linked_devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_notification_id_app_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."app_notifications"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "notification_queue" ADD CONSTRAINT "notification_queue_assignment_id_asset_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."asset_assignments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "notification_queue" ADD CONSTRAINT "notification_queue_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "notification_rules" ADD CONSTRAINT "notification_rules_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "user_refresh_tokens" ADD CONSTRAINT "user_refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "webhook_subscriptions" ADD CONSTRAINT "webhook_subscriptions_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "api_keys_key_hash_idx" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "api_keys_is_revoked_idx" ON "api_keys" USING btree ("is_revoked");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "app_notifications_user_id_idx" ON "app_notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "app_notifications_is_read_idx" ON "app_notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "app_notifications_created_at_idx" ON "app_notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "app_notifications_user_is_read_idx" ON "app_notifications" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "linked_devices_user_id_idx" ON "linked_devices" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "linked_devices_jwt_id_idx" ON "linked_devices" USING btree ("jwt_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "linked_devices_is_revoked_idx" ON "linked_devices" USING btree ("is_revoked");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_logs_event_type_idx" ON "notification_logs" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_logs_channel_idx" ON "notification_logs" USING btree ("channel");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_logs_status_idx" ON "notification_logs" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "notification_queue_assignment_recipient_event_unique" ON "notification_queue" USING btree ("assignment_id","event_type","recipient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_queue_assignment_idx" ON "notification_queue" USING btree ("assignment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_queue_recipient_idx" ON "notification_queue" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_rules_category_idx" ON "notification_rules" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_subscriptions_is_active_idx" ON "webhook_subscriptions" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_subscriptions_events_gin_idx" ON "webhook_subscriptions" USING gin ("events");--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "software_licenses" ADD CONSTRAINT "software_licenses_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_assignments_asset_returned_idx" ON "asset_assignments" USING btree ("asset_id","returned_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_assignments_user_idx" ON "asset_assignments" USING btree ("assigned_to_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_assignments_active_user_idx" ON "asset_assignments" USING btree ("assigned_to_user_id","expected_return_date") WHERE "asset_assignments"."returned_date" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_documents_asset_id_idx" ON "asset_documents" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_purchases_asset_id_idx" ON "asset_purchases" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_purchases_warranty_expiry_idx" ON "asset_purchases" USING btree ("warranty_expiry");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_purchases_purchase_date_idx" ON "asset_purchases" USING btree ("purchase_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assets_asset_tag_trgm_idx" ON "assets" USING gin ("asset_tag" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assets_name_trgm_idx" ON "assets" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assets_serial_number_trgm_idx" ON "assets" USING gin ("serial_number" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "categories_pillar_active_idx" ON "categories" USING btree ("pillar","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "maintenance_tickets_asset_status_created_idx" ON "maintenance_tickets" USING btree ("asset_id","status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "maintenance_tickets_status_estimated_return_idx" ON "maintenance_tickets" USING btree ("status","estimated_return_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "software_allocations_license_revoked_idx" ON "software_allocations" USING btree ("license_id","revoked_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "software_allocations_user_revoked_idx" ON "software_allocations" USING btree ("assigned_to_user_id","revoked_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "software_licenses_active_expiry_idx" ON "software_licenses" USING btree ("is_active","expiry_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "software_licenses_model_id_idx" ON "software_licenses" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "software_licenses_asset_id_idx" ON "software_licenses" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "system_audit_logs_performed_at_id_idx" ON "system_audit_logs" USING btree ("performed_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "system_audit_logs_entity_timeline_idx" ON "system_audit_logs" USING btree ("entity_type","entity_id","performed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "system_audit_logs_actor_timeline_idx" ON "system_audit_logs" USING btree ("performed_by_id","performed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_department_active_idx" ON "users" USING btree ("department_id","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_name_trgm_idx" ON "users" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_email_trgm_idx" ON "users" USING gin ("email" gin_trgm_ops);--> statement-breakpoint
