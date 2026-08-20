ALTER TABLE "custom_statuses"
  ADD COLUMN IF NOT EXISTS "allowed_actions" jsonb DEFAULT '["edit"]'::jsonb NOT NULL;
