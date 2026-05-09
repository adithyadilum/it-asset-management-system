-- Migration: Convert assets.status from enum to varchar
-- This allows storing both built-in statuses AND custom statuses from master data.
--
-- Run this against your Neon database:
--   psql $DATABASE_URL -f scripts/migrate-status-to-varchar.sql
--
-- Or via Neon console SQL editor.

BEGIN;

-- Step 1: Convert the column from enum to varchar, preserving all existing data
ALTER TABLE assets
  ALTER COLUMN status TYPE varchar(100) USING status::varchar;

-- Step 2 (optional): Drop the old enum type if no other columns use it
-- DROP TYPE IF EXISTS asset_status;

COMMIT;
