-- Gives repair costs a currency.
--
-- Both repair dialogs offered a currency picker with nowhere to store the
-- answer, so the amount was kept bare and read as LKR wherever it was shown.
-- Existing rows take the default, which matches how they were already being
-- interpreted -- so this is a no-op for their displayed values.
ALTER TABLE "maintenance_tickets" ADD COLUMN IF NOT EXISTS "currency_code" varchar(3) DEFAULT 'LKR' NOT NULL;
