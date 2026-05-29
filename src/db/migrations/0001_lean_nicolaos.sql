CREATE TABLE "report_templates" (
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
ALTER TABLE "assets" ALTER COLUMN "status" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "assets" ALTER COLUMN "status" SET DEFAULT 'Available';--> statement-breakpoint
ALTER TABLE "asset_disposals" ADD COLUMN "disposal_method" varchar(50);--> statement-breakpoint
ALTER TABLE "asset_disposals" ADD COLUMN "disposal_receipt_url" varchar(500);--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "is_archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "custom_statuses" ADD COLUMN "icon_name" varchar(50) DEFAULT 'CircleDot' NOT NULL;--> statement-breakpoint
ALTER TABLE "custom_statuses" ADD COLUMN "color_theme" varchar(50) DEFAULT 'gray' NOT NULL;--> statement-breakpoint
ALTER TABLE "report_templates" ADD CONSTRAINT "report_templates_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "asset_disposals_resolved_at_idx" ON "asset_disposals" USING btree ("resolved_at");--> statement-breakpoint
CREATE INDEX "asset_disposals_method_idx" ON "asset_disposals" USING btree ("disposal_method");--> statement-breakpoint
CREATE INDEX "assets_is_archived_idx" ON "assets" USING btree ("is_archived");--> statement-breakpoint
CREATE INDEX "assets_status_archived_idx" ON "assets" USING btree ("status","is_archived");--> statement-breakpoint
ALTER TABLE "custom_statuses" DROP COLUMN "color";