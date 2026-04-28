ALTER TABLE "owners" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "software_allocations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "software_licenses" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "owners" CASCADE;--> statement-breakpoint
DROP TABLE "software_allocations" CASCADE;--> statement-breakpoint
DROP TABLE "software_licenses" CASCADE;--> statement-breakpoint
ALTER TABLE "brands" DROP CONSTRAINT "brands_uuid_unique";--> statement-breakpoint
ALTER TABLE "brands" DROP CONSTRAINT "brands_brand_code_unique";--> statement-breakpoint
ALTER TABLE "categories" DROP CONSTRAINT "categories_uuid_unique";--> statement-breakpoint
ALTER TABLE "categories" DROP CONSTRAINT "categories_category_code_unique";--> statement-breakpoint
ALTER TABLE "departments" DROP CONSTRAINT "departments_uuid_unique";--> statement-breakpoint
ALTER TABLE "departments" DROP CONSTRAINT "departments_department_code_unique";--> statement-breakpoint
ALTER TABLE "locations" DROP CONSTRAINT "locations_uuid_unique";--> statement-breakpoint
ALTER TABLE "locations" DROP CONSTRAINT "locations_location_code_unique";--> statement-breakpoint
ALTER TABLE "models" DROP CONSTRAINT "models_uuid_unique";--> statement-breakpoint
ALTER TABLE "models" DROP CONSTRAINT "models_model_code_unique";--> statement-breakpoint
ALTER TABLE "vendors" DROP CONSTRAINT "vendors_uuid_unique";--> statement-breakpoint
ALTER TABLE "vendors" DROP CONSTRAINT "vendors_vendor_code_unique";--> statement-breakpoint
ALTER TABLE "assets" DROP CONSTRAINT "assets_owner_id_owners_id_fk";
--> statement-breakpoint
DROP INDEX "assets_model_id_idx";--> statement-breakpoint
DROP INDEX "assets_location_id_idx";--> statement-breakpoint
DROP INDEX "assets_owner_id_idx";--> statement-breakpoint
DROP INDEX "models_brand_id_idx";--> statement-breakpoint
DROP INDEX "models_category_id_idx";--> statement-breakpoint
ALTER TABLE "asset_purchases" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "asset_purchases" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "assets" DROP COLUMN "owner_id";--> statement-breakpoint
ALTER TABLE "brands" DROP COLUMN "uuid";--> statement-breakpoint
ALTER TABLE "brands" DROP COLUMN "brand_code";--> statement-breakpoint
ALTER TABLE "categories" DROP COLUMN "uuid";--> statement-breakpoint
ALTER TABLE "categories" DROP COLUMN "category_code";--> statement-breakpoint
ALTER TABLE "departments" DROP COLUMN "uuid";--> statement-breakpoint
ALTER TABLE "departments" DROP COLUMN "department_code";--> statement-breakpoint
ALTER TABLE "locations" DROP COLUMN "uuid";--> statement-breakpoint
ALTER TABLE "locations" DROP COLUMN "location_code";--> statement-breakpoint
ALTER TABLE "maintenance_records" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "maintenance_records" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "models" DROP COLUMN "uuid";--> statement-breakpoint
ALTER TABLE "models" DROP COLUMN "model_code";--> statement-breakpoint
ALTER TABLE "models" DROP COLUMN "image_url";--> statement-breakpoint
ALTER TABLE "vendors" DROP COLUMN "uuid";--> statement-breakpoint
ALTER TABLE "vendors" DROP COLUMN "vendor_code";--> statement-breakpoint
DROP TYPE "public"."license_type";