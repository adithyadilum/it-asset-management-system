CREATE TABLE IF NOT EXISTS "asset_cost_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset_id" uuid NOT NULL,
	"group_id" integer NOT NULL,
	"shared" boolean DEFAULT false NOT NULL,
	"valid_from" timestamp with time zone NOT NULL,
	"valid_to" timestamp with time zone,
	CONSTRAINT "asset_cost_policies_valid_period" CHECK ("asset_cost_policies"."valid_to" IS NULL OR "asset_cost_policies"."valid_to" > "asset_cost_policies"."valid_from")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "financial_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"department_id" integer,
	"location_id" integer,
	"coverage_from" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financial_groups_department_unique" UNIQUE("department_id"),
	CONSTRAINT "financial_groups_location_unique" UNIQUE("location_id"),
	CONSTRAINT "financial_groups_one_target" CHECK (("financial_groups"."department_id" IS NOT NULL)::int + ("financial_groups"."location_id" IS NOT NULL)::int = 1)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "financial_memberships" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"valid_from" timestamp with time zone NOT NULL,
	"valid_to" timestamp with time zone,
	"reason" text NOT NULL,
	CONSTRAINT "financial_memberships_valid_period" CHECK ("financial_memberships"."valid_to" IS NULL OR "financial_memberships"."valid_to" > "financial_memberships"."valid_from")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "software_financial_terms" (
	"id" serial PRIMARY KEY NOT NULL,
	"license_id" uuid NOT NULL,
	"source_purchase_id" integer,
	"amount" numeric(12, 2),
	"currency_code" varchar(3) NOT NULL,
	"exchange_rate" numeric(15, 6),
	"valid_from" timestamp with time zone NOT NULL,
	"valid_to" timestamp with time zone NOT NULL,
	"seats" integer NOT NULL,
	"allocation_life_months" integer,
	CONSTRAINT "software_financial_terms_source_purchase_id_unique" UNIQUE("source_purchase_id"),
	CONSTRAINT "software_financial_terms_valid_period" CHECK ("software_financial_terms"."valid_to" > "software_financial_terms"."valid_from"),
	CONSTRAINT "software_financial_terms_valid_cost" CHECK (("software_financial_terms"."amount" IS NULL OR "software_financial_terms"."amount" >= 0) AND "software_financial_terms"."seats" > 0 AND ("software_financial_terms"."allocation_life_months" IS NULL OR "software_financial_terms"."allocation_life_months" > 0))
);
--> statement-breakpoint
DO $$ BEGIN
ALTER TABLE "asset_cost_policies" ADD CONSTRAINT "asset_cost_policies_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
ALTER TABLE "asset_cost_policies" ADD CONSTRAINT "asset_cost_policies_group_id_financial_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."financial_groups"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
ALTER TABLE "financial_groups" ADD CONSTRAINT "financial_groups_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
ALTER TABLE "financial_groups" ADD CONSTRAINT "financial_groups_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
ALTER TABLE "financial_memberships" ADD CONSTRAINT "financial_memberships_group_id_financial_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."financial_groups"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
ALTER TABLE "financial_memberships" ADD CONSTRAINT "financial_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
ALTER TABLE "software_financial_terms" ADD CONSTRAINT "software_financial_terms_license_id_software_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."software_licenses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN
ALTER TABLE "software_financial_terms" ADD CONSTRAINT "software_financial_terms_source_purchase_id_asset_purchases_id_fk" FOREIGN KEY ("source_purchase_id") REFERENCES "public"."asset_purchases"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_cost_policies_asset_period_idx" ON "asset_cost_policies" USING btree ("asset_id","valid_from","valid_to");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "financial_memberships_group_period_idx" ON "financial_memberships" USING btree ("group_id","valid_from","valid_to");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "financial_memberships_user_idx" ON "financial_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "software_financial_terms_license_period_idx" ON "software_financial_terms" USING btree ("license_id","valid_from","valid_to");
--> statement-breakpoint
INSERT INTO financial_groups (name, department_id)
SELECT name, id FROM departments ON CONFLICT (department_id) DO NOTHING;
--> statement-breakpoint
INSERT INTO financial_groups (name, location_id)
SELECT name, id FROM locations ON CONFLICT (location_id) DO NOTHING;
--> statement-breakpoint
INSERT INTO financial_memberships (group_id, user_id, valid_from, reason)
SELECT g.id, u.id, g.coverage_from, 'Initial membership at financial reporting rollout'
FROM users u JOIN financial_groups g ON g.department_id = u.department_id
WHERE u.is_active AND NOT EXISTS (SELECT 1 FROM financial_memberships m WHERE m.group_id = g.id AND m.user_id = u.id);
--> statement-breakpoint
INSERT INTO asset_cost_policies (asset_id, group_id, shared, valid_from)
SELECT a.id, g.id, c.pillar IN ('Office Furniture', 'Office Electronics'), g.coverage_from
FROM assets a JOIN financial_groups g ON g.location_id = a.location_id
JOIN models m ON m.id = a.model_id JOIN categories c ON c.id = m.category_id
WHERE NOT EXISTS (SELECT 1 FROM asset_cost_policies p WHERE p.asset_id = a.id);
