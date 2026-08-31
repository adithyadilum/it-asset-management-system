-- Records the salvage value expected at the end of an asset's life.
--
-- Captured on the registration form so depreciation has a floor to work
-- toward, and so the figure entered at purchase can later be compared with
-- what the asset actually fetched on disposal.
--
-- Idempotent and non-destructive: nullable with no default, so existing rows
-- are untouched. CI applies every migration twice with __drizzle_migrations
-- cleared in between, which is why the guard is required.
ALTER TABLE "asset_purchases" ADD COLUMN IF NOT EXISTS "estimated_salvage_value" numeric(12, 2);
