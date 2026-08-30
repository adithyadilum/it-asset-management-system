-- Consolidated baseline for the whole schema.
--
-- This replaces migrations 0000-0007, kept for reference under
-- src/db/migrations-archive/ but no longer in the journal. That chain could
-- never run from an empty database: it was written against a schema that
-- `drizzle-kit push` had already moved on from, so 0006 built an index on
-- `software_licenses.asset_id` -- a column no migration added until 0007, one
-- file too late. CI failed on every run with `column "asset_id" does not exist`.
--
-- Every statement here is idempotent, which is what makes the squash safe. A
-- database provisioned by `push` (which is how the deployed ones were built)
-- already holds all of this and no-ops through the whole file; an empty database
-- gets the complete schema. Nothing is dropped, so no data is at risk either way.
--
-- Generated from src/db/schema.ts, which is the single source of truth. Keep it
-- that way: change schema.ts, run `npm run db:generate`, and commit the diff.

-- Required by the trigram indexes below. drizzle-kit does not manage
-- extensions, so this cannot come from the generator.
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."asset_status" AS ENUM('Available', 'Assigned', 'In Repair', 'Defective', 'Lost', 'Retired', 'Pending Disposal', 'Disposed', 'Returned');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."assignment_state" AS ENUM('pending approval', 'assigned', 'overdue', 'requested', 'returned');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."asset_condition" AS ENUM('New', 'Excellent', 'Fair', 'Poor', 'Damaged');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."disposal_status" AS ENUM('Pending Approval', 'Approved', 'Rejected', 'Completed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."license_type" AS ENUM('Perpetual', 'Subscription', 'Open Source / Free');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."location_type" AS ENUM('HQ', 'Branch', 'Floor', 'Room', 'Remote');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."maintenance_ticket_status" AS ENUM('ACTIVE', 'COMPLETED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."maintenance_ticket_type" AS ENUM('VENDOR', 'INTERNAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."notification_category" AS ENUM('HARDWARE_LIFECYCLE', 'OPERATIONAL', 'SECURITY', 'FINANCIAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."notification_channel" AS ENUM('in_app', 'email', 'teams');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."notification_event_type" AS ENUM('WARRANTY_EXPIRY', 'SOFTWARE_LICENSE_RENEWAL', 'RETURN_OVERDUE', 'MAINTENANCE_COMPLETED', 'DISPOSAL_REQUEST', 'DISPOSAL_APPROVED', 'DISPOSAL_REJECTED', 'ROLE_CHANGE', 'ASSIGNMENT_PENDING', 'ASSIGNMENT_ACCEPTED', 'ASSIGNMENT_DECLINED', 'ASSET_DEFECTIVE_REPORTED', 'PENDING_ACCEPTANCE', 'REMINDER_24H', 'REMINDER_48H', 'UPCOMING_RETURN', 'RETURN_REQUESTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."notification_log_status" AS ENUM('sent', 'failed', 'pending');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."notification_queue_event_type" AS ENUM('PENDING_ACCEPTANCE', 'REMINDER_24H', 'REMINDER_48H', 'REMINDER_72H_ADMIN');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."pillar" AS ENUM('Hardware', 'Software', 'Office Furniture', 'Office Electronics');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."role" AS ENUM('GlobalAdmin', 'ITOperator', 'FinancialAuditor', 'Employee');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
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
CREATE TABLE IF NOT EXISTS "asset_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset_id" uuid NOT NULL,
	"assigned_to_user_id" uuid,
	"assigned_to_location_id" integer,
	"assigned_by_id" uuid NOT NULL,
	"assigned_date" timestamp DEFAULT now() NOT NULL,
	"expected_return_date" date,
	"returned_date" timestamp,
	"return_condition" "asset_condition",
	"notes" text,
	"acceptance_status" varchar(50),
	"accepted_at" timestamp,
	"return_requested_at" timestamp,
	"state" "assignment_state" DEFAULT 'pending approval' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "asset_disposals" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset_id" uuid NOT NULL,
	"requested_by_id" uuid NOT NULL,
	"approved_by_id" uuid,
	"status" "disposal_status" DEFAULT 'Pending Approval' NOT NULL,
	"reason" varchar(255) NOT NULL,
	"justification" text,
	"rejection_reason" text,
	"disposal_method" varchar(50),
	"disposal_receipt_url" varchar(500),
	"data_wiped" boolean DEFAULT false,
	"tags_removed" boolean DEFAULT false,
	"actual_salvage_value" numeric(12, 2),
	"book_value_at_disposal" numeric(12, 2),
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "asset_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset_id" uuid NOT NULL,
	"document_type" varchar(100),
	"file_url" varchar(500) NOT NULL,
	"uploaded_by_id" uuid NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "asset_purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset_id" uuid NOT NULL,
	"vendor_id" integer,
	"purchase_date" date,
	"base_price" numeric(12, 2),
	"tax" numeric(12, 2),
	"shipping_cost" numeric(12, 2),
	"total_cost" numeric(12, 2),
	"currency_code" varchar(3) DEFAULT 'LKR',
	"exchange_rate" numeric(15, 6) DEFAULT '1',
	"warranty_expiry" date,
	"invoice_url" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_tag" varchar(100) NOT NULL,
	"serial_number" varchar(255),
	"name" varchar(255),
	"model_id" integer NOT NULL,
	"location_id" integer,
	"owner_id" integer,
	"status" varchar(100) DEFAULT 'Available' NOT NULL,
	"condition" "asset_condition",
	"instance_attributes" jsonb,
	"is_archived" boolean DEFAULT false NOT NULL,
	"useful_life_months" integer,
	"salvage_value" numeric(12, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "assets_asset_tag_unique" UNIQUE("asset_tag")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "brands" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"brand_code" varchar(50),
	"name" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "brands_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "brands_brand_code_unique" UNIQUE("brand_code"),
	CONSTRAINT "brands_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"category_code" varchar(50),
	"name" varchar(255) NOT NULL,
	"pillar" "pillar" NOT NULL,
	"prefix" varchar(10) NOT NULL,
	"requires_serial" boolean DEFAULT true NOT NULL,
	"is_consumable" boolean DEFAULT false NOT NULL,
	"custom_schema" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "categories_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "categories_category_code_unique" UNIQUE("category_code"),
	CONSTRAINT "categories_prefix_unique" UNIQUE("prefix"),
	CONSTRAINT "pillar_name_idx" UNIQUE("pillar","name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "custom_statuses" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"icon_name" varchar(50) DEFAULT 'CircleDot' NOT NULL,
	"color_theme" varchar(50) DEFAULT 'gray' NOT NULL,
	"allowed_actions" jsonb DEFAULT '["edit"]'::jsonb NOT NULL,
	"created_by_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"department_code" varchar(50),
	"name" varchar(255) NOT NULL,
	"short_code" varchar(50) NOT NULL,
	"cost_center_id" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "departments_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "departments_department_code_unique" UNIQUE("department_code"),
	CONSTRAINT "departments_name_unique" UNIQUE("name"),
	CONSTRAINT "departments_short_code_unique" UNIQUE("short_code"),
	CONSTRAINT "departments_cost_center_id_unique" UNIQUE("cost_center_id")
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
CREATE TABLE IF NOT EXISTS "locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"location_code" varchar(50),
	"name" varchar(255) NOT NULL,
	"type" "location_type" NOT NULL,
	"parent_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "locations_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "locations_location_code_unique" UNIQUE("location_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "maintenance_tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset_id" uuid NOT NULL,
	"ticket_type" "maintenance_ticket_type" NOT NULL,
	"vendor_name" varchar(255),
	"rma_number" varchar(100),
	"reported_issue" text NOT NULL,
	"resolution_notes" text,
	"estimated_cost" numeric(12, 2),
	"actual_cost" numeric(12, 2),
	"estimated_return_date" date,
	"actual_completion_date" timestamp,
	"status" "maintenance_ticket_status" DEFAULT 'ACTIVE' NOT NULL,
	"dispatched_by_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "models" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"model_code" varchar(50),
	"brand_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"image_url" varchar(500),
	"technical_details" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "models_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "models_model_code_unique" UNIQUE("model_code"),
	CONSTRAINT "brand_model_idx" UNIQUE("brand_id","name")
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
CREATE TABLE IF NOT EXISTS "owners" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"owner_code" varchar(50),
	"company_name" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "owners_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "owners_owner_code_unique" UNIQUE("owner_code"),
	CONSTRAINT "owners_company_name_unique" UNIQUE("company_name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "report_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"report_code" varchar(50) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"data_source" varchar(100) NOT NULL,
	"filters" jsonb,
	"fields" jsonb,
	"sort_direction" varchar(10) DEFAULT 'asc' NOT NULL,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "report_templates_report_code_unique" UNIQUE("report_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"token_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "sessions_token_id_unique" UNIQUE("token_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "software_allocations" (
	"id" serial PRIMARY KEY NOT NULL,
	"license_id" uuid NOT NULL,
	"assigned_to_user_id" uuid NOT NULL,
	"allocated_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "software_licenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" integer NOT NULL,
	"asset_id" uuid,
	"license_key" varchar(255),
	"license_type" "license_type" NOT NULL,
	"total_seats" integer DEFAULT 1 NOT NULL,
	"start_date" date,
	"expiry_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "system_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" varchar(100) NOT NULL,
	"entity_id" varchar(255) NOT NULL,
	"action_type" varchar(100) NOT NULL,
	"performed_by_id" uuid NOT NULL,
	"old_value" jsonb,
	"new_value" jsonb,
	"ip_address" varchar(45),
	"performed_at" timestamp DEFAULT now() NOT NULL
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
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" text NOT NULL,
	"department_id" integer,
	"role" "role" DEFAULT 'Employee' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vendors" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"vendor_code" varchar(50),
	"company_name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"website" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "vendors_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "vendors_vendor_code_unique" UNIQUE("vendor_code"),
	CONSTRAINT "vendors_company_name_unique" UNIQUE("company_name")
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
-- Brings a database built by the archived 0000-0006 chain up to date. Those
-- tables already exist there, so CREATE TABLE IF NOT EXISTS above skips them and
-- the columns 0007 introduced have to be added here. No-ops on a fresh or
-- pushed database. Ordered before the foreign keys: one of them targets
-- software_licenses.asset_id.
ALTER TYPE "public"."asset_status" ADD VALUE IF NOT EXISTS 'Returned';
--> statement-breakpoint
ALTER TABLE "asset_assignments" ADD COLUMN IF NOT EXISTS "state" "assignment_state" DEFAULT 'pending approval' NOT NULL;
--> statement-breakpoint
ALTER TABLE "asset_purchases" ADD COLUMN IF NOT EXISTS "exchange_rate" numeric(15, 6) DEFAULT '1';
--> statement-breakpoint
ALTER TABLE "asset_purchases" ALTER COLUMN "currency_code" SET DEFAULT 'LKR';
--> statement-breakpoint
ALTER TABLE "software_licenses" ADD COLUMN IF NOT EXISTS "asset_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "app_notifications" ADD CONSTRAINT "app_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_assigned_to_location_id_locations_id_fk" FOREIGN KEY ("assigned_to_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_assigned_by_id_users_id_fk" FOREIGN KEY ("assigned_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "asset_disposals" ADD CONSTRAINT "asset_disposals_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "asset_disposals" ADD CONSTRAINT "asset_disposals_requested_by_id_users_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "asset_disposals" ADD CONSTRAINT "asset_disposals_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "asset_documents" ADD CONSTRAINT "asset_documents_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "asset_documents" ADD CONSTRAINT "asset_documents_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "asset_purchases" ADD CONSTRAINT "asset_purchases_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "asset_purchases" ADD CONSTRAINT "asset_purchases_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "assets" ADD CONSTRAINT "assets_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "assets" ADD CONSTRAINT "assets_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "assets" ADD CONSTRAINT "assets_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "custom_statuses" ADD CONSTRAINT "custom_statuses_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "linked_devices" ADD CONSTRAINT "linked_devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "locations" ADD CONSTRAINT "locations_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_dispatched_by_id_users_id_fk" FOREIGN KEY ("dispatched_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "models" ADD CONSTRAINT "models_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "models" ADD CONSTRAINT "models_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_notification_id_app_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."app_notifications"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "notification_queue" ADD CONSTRAINT "notification_queue_assignment_id_asset_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."asset_assignments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "notification_queue" ADD CONSTRAINT "notification_queue_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "notification_rules" ADD CONSTRAINT "notification_rules_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "report_templates" ADD CONSTRAINT "report_templates_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "software_allocations" ADD CONSTRAINT "software_allocations_license_id_software_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."software_licenses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "software_allocations" ADD CONSTRAINT "software_allocations_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "software_licenses" ADD CONSTRAINT "software_licenses_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "software_licenses" ADD CONSTRAINT "software_licenses_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "system_audit_logs" ADD CONSTRAINT "system_audit_logs_performed_by_id_users_id_fk" FOREIGN KEY ("performed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "user_refresh_tokens" ADD CONSTRAINT "user_refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "webhook_subscriptions" ADD CONSTRAINT "webhook_subscriptions_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "api_keys_key_hash_idx" ON "api_keys" USING btree ("key_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "api_keys_is_revoked_idx" ON "api_keys" USING btree ("is_revoked");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "app_notifications_user_id_idx" ON "app_notifications" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "app_notifications_is_read_idx" ON "app_notifications" USING btree ("is_read");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "app_notifications_created_at_idx" ON "app_notifications" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "app_notifications_user_is_read_idx" ON "app_notifications" USING btree ("user_id","is_read");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_assignments_asset_returned_idx" ON "asset_assignments" USING btree ("asset_id","returned_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_assignments_user_idx" ON "asset_assignments" USING btree ("assigned_to_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_assignments_active_user_idx" ON "asset_assignments" USING btree ("assigned_to_user_id","expected_return_date") WHERE "asset_assignments"."returned_date" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_disposals_status_idx" ON "asset_disposals" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_disposals_asset_id_idx" ON "asset_disposals" USING btree ("asset_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_disposals_requested_by_idx" ON "asset_disposals" USING btree ("requested_by_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_disposals_resolved_at_idx" ON "asset_disposals" USING btree ("resolved_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_disposals_method_idx" ON "asset_disposals" USING btree ("disposal_method");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_documents_asset_id_idx" ON "asset_documents" USING btree ("asset_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_purchases_asset_id_idx" ON "asset_purchases" USING btree ("asset_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_purchases_warranty_expiry_idx" ON "asset_purchases" USING btree ("warranty_expiry");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_purchases_purchase_date_idx" ON "asset_purchases" USING btree ("purchase_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assets_model_id_idx" ON "assets" USING btree ("model_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assets_location_id_idx" ON "assets" USING btree ("location_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assets_owner_id_idx" ON "assets" USING btree ("owner_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assets_is_archived_idx" ON "assets" USING btree ("is_archived");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assets_status_archived_idx" ON "assets" USING btree ("status","is_archived");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assets_asset_tag_trgm_idx" ON "assets" USING gin ("asset_tag" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assets_name_trgm_idx" ON "assets" USING gin ("name" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assets_serial_number_trgm_idx" ON "assets" USING gin ("serial_number" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "categories_pillar_active_idx" ON "categories" USING btree ("pillar","is_active");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "linked_devices_user_id_idx" ON "linked_devices" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "linked_devices_jwt_id_idx" ON "linked_devices" USING btree ("jwt_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "linked_devices_is_revoked_idx" ON "linked_devices" USING btree ("is_revoked");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "maintenance_tickets_asset_status_created_idx" ON "maintenance_tickets" USING btree ("asset_id","status","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "maintenance_tickets_status_estimated_return_idx" ON "maintenance_tickets" USING btree ("status","estimated_return_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "models_brand_id_idx" ON "models" USING btree ("brand_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "models_category_id_idx" ON "models" USING btree ("category_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_logs_event_type_idx" ON "notification_logs" USING btree ("event_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_logs_channel_idx" ON "notification_logs" USING btree ("channel");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_logs_status_idx" ON "notification_logs" USING btree ("status");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "notification_queue_assignment_recipient_event_unique" ON "notification_queue" USING btree ("assignment_id","event_type","recipient_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_queue_assignment_idx" ON "notification_queue" USING btree ("assignment_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_queue_recipient_idx" ON "notification_queue" USING btree ("recipient_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_rules_category_idx" ON "notification_rules" USING btree ("category");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "software_allocations_license_revoked_idx" ON "software_allocations" USING btree ("license_id","revoked_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "software_allocations_user_revoked_idx" ON "software_allocations" USING btree ("assigned_to_user_id","revoked_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "software_licenses_active_expiry_idx" ON "software_licenses" USING btree ("is_active","expiry_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "software_licenses_model_id_idx" ON "software_licenses" USING btree ("model_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "software_licenses_asset_id_idx" ON "software_licenses" USING btree ("asset_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "system_audit_logs_performed_at_id_idx" ON "system_audit_logs" USING btree ("performed_at" DESC NULLS LAST,"id" DESC NULLS LAST);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "system_audit_logs_entity_timeline_idx" ON "system_audit_logs" USING btree ("entity_type","entity_id","performed_at" DESC NULLS LAST);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "system_audit_logs_actor_timeline_idx" ON "system_audit_logs" USING btree ("performed_by_id","performed_at" DESC NULLS LAST);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_department_active_idx" ON "users" USING btree ("department_id","is_active");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_name_trgm_idx" ON "users" USING gin ("name" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_email_trgm_idx" ON "users" USING gin ("email" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_subscriptions_is_active_idx" ON "webhook_subscriptions" USING btree ("is_active");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_subscriptions_events_gin_idx" ON "webhook_subscriptions" USING gin ("events");
