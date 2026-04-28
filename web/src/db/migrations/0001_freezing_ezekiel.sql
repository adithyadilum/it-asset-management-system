CREATE TYPE "public"."asset_status" AS ENUM('Available', 'Assigned', 'In Repair', 'Defective', 'Lost', 'Retired', 'Disposed');--> statement-breakpoint
CREATE TYPE "public"."asset_condition" AS ENUM('New', 'Excellent', 'Fair', 'Poor', 'Damaged');--> statement-breakpoint
CREATE TYPE "public"."disposal_status" AS ENUM('Pending Approval', 'Approved', 'Rejected', 'Completed');--> statement-breakpoint
CREATE TYPE "public"."license_type" AS ENUM('Perpetual', 'Subscription', 'Open Source / Free');--> statement-breakpoint
CREATE TYPE "public"."location_type" AS ENUM('HQ', 'Branch', 'Floor', 'Room', 'Remote');--> statement-breakpoint
CREATE TYPE "public"."maintenance_status" AS ENUM('Open', 'In Progress', 'Pending Parts', 'Resolved', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."pillar" AS ENUM('IT & Digital', 'Software', 'Office Furniture', 'Office Electronics');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('GlobalAdmin', 'ITOperator', 'FinanceAuditor', 'Employee');--> statement-breakpoint
CREATE TABLE "asset_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset_id" uuid NOT NULL,
	"assigned_to_user_id" uuid,
	"assigned_to_location_id" integer,
	"assigned_by_id" uuid NOT NULL,
	"assigned_date" timestamp DEFAULT now() NOT NULL,
	"expected_return_date" date,
	"returned_date" timestamp,
	"return_condition" "asset_condition",
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "asset_disposals" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset_id" uuid NOT NULL,
	"requested_by_id" uuid NOT NULL,
	"approved_by_id" uuid,
	"status" "disposal_status" DEFAULT 'Pending Approval' NOT NULL,
	"reason" varchar(255) NOT NULL,
	"justification" text,
	"data_wiped" boolean DEFAULT false,
	"tags_removed" boolean DEFAULT false,
	"actual_salvage_value" numeric(12, 2),
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "asset_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset_id" uuid NOT NULL,
	"document_type" varchar(100),
	"file_url" varchar(500) NOT NULL,
	"uploaded_by_id" uuid NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset_id" uuid NOT NULL,
	"vendor_id" integer,
	"purchase_date" date,
	"base_price" numeric(12, 2),
	"tax" numeric(12, 2),
	"shipping_cost" numeric(12, 2),
	"total_cost" numeric(12, 2),
	"currency_code" varchar(3) DEFAULT 'USD',
	"warranty_expiry" date,
	"invoice_url" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_tag" varchar(100) NOT NULL,
	"serial_number" varchar(255),
	"name" varchar(255),
	"model_id" integer NOT NULL,
	"location_id" integer,
	"owner_id" integer,
	"status" "asset_status" DEFAULT 'Available' NOT NULL,
	"condition" "asset_condition",
	"instance_attributes" jsonb,
	"useful_life_months" integer,
	"salvage_value" numeric(12, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "assets_asset_tag_unique" UNIQUE("asset_tag")
);
--> statement-breakpoint
CREATE TABLE "brands" (
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
CREATE TABLE "categories" (
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
CREATE TABLE "departments" (
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
CREATE TABLE "locations" (
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
CREATE TABLE "maintenance_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset_id" uuid NOT NULL,
	"vendor_id" integer,
	"reported_by_id" uuid NOT NULL,
	"status" "maintenance_status" DEFAULT 'Open' NOT NULL,
	"description" text NOT NULL,
	"rma_ticket_number" varchar(100),
	"estimated_cost" numeric(12, 2),
	"actual_cost" numeric(12, 2),
	"service_date" date,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "models" (
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
CREATE TABLE "owners" (
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
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"token_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "sessions_token_id_unique" UNIQUE("token_id")
);
--> statement-breakpoint
CREATE TABLE "software_allocations" (
	"id" serial PRIMARY KEY NOT NULL,
	"license_id" uuid NOT NULL,
	"assigned_to_user_id" uuid NOT NULL,
	"allocated_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "software_licenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" integer NOT NULL,
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
CREATE TABLE "system_audit_logs" (
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
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" text NOT NULL,
	"password" text NOT NULL,
	"department_id" integer,
	"role" "role" DEFAULT 'Employee' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vendors" (
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
ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_assigned_to_location_id_locations_id_fk" FOREIGN KEY ("assigned_to_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_assigned_by_id_users_id_fk" FOREIGN KEY ("assigned_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_disposals" ADD CONSTRAINT "asset_disposals_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_disposals" ADD CONSTRAINT "asset_disposals_requested_by_id_users_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_disposals" ADD CONSTRAINT "asset_disposals_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_documents" ADD CONSTRAINT "asset_documents_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_documents" ADD CONSTRAINT "asset_documents_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_purchases" ADD CONSTRAINT "asset_purchases_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_purchases" ADD CONSTRAINT "asset_purchases_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_reported_by_id_users_id_fk" FOREIGN KEY ("reported_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "models" ADD CONSTRAINT "models_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "models" ADD CONSTRAINT "models_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "software_allocations" ADD CONSTRAINT "software_allocations_license_id_software_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."software_licenses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "software_allocations" ADD CONSTRAINT "software_allocations_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "software_licenses" ADD CONSTRAINT "software_licenses_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_audit_logs" ADD CONSTRAINT "system_audit_logs_performed_by_id_users_id_fk" FOREIGN KEY ("performed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assets_model_id_idx" ON "assets" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX "assets_location_id_idx" ON "assets" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "assets_owner_id_idx" ON "assets" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "models_brand_id_idx" ON "models" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "models_category_id_idx" ON "models" USING btree ("category_id");