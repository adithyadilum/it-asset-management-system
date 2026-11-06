ALTER TABLE "maintenance_tickets" ADD COLUMN IF NOT EXISTS "exchange_rate" numeric(15, 6);
--> statement-breakpoint
-- LKR needs no conversion. Never manufacture legacy foreign-currency rates.
UPDATE "maintenance_tickets" SET "exchange_rate" = 1 WHERE "currency_code" = 'LKR' AND "exchange_rate" IS NULL;
--> statement-breakpoint
-- Fill missing residuals only where acquisition cardinality is unambiguous.
-- Existing residuals and locked disposal valuations remain authoritative.
UPDATE "assets" AS a SET "salvage_value" = p."estimated_salvage_value"
FROM "asset_purchases" AS p
WHERE p."asset_id" = a."id" AND a."salvage_value" IS NULL
AND p."estimated_salvage_value" >= 0 AND p."estimated_salvage_value" <= p."total_cost"
AND (SELECT COUNT(*) FROM "asset_purchases" AS other WHERE other."asset_id" = a."id") = 1;
