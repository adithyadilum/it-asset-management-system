-- Ties a disposal certificate to the disposal that produced it, and unsticks
-- location assignments that could never leave 'pending approval'.
--
-- Idempotent throughout, and non-destructive: the drift test asserts both, and
-- CI applies every migration twice with __drizzle_migrations cleared in
-- between to prove it.

ALTER TABLE "asset_documents" ADD COLUMN IF NOT EXISTS "disposal_id" integer;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "asset_documents" ADD CONSTRAINT "asset_documents_disposal_id_asset_disposals_id_fk" FOREIGN KEY ("disposal_id") REFERENCES "public"."asset_disposals"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "asset_documents_disposal_id_idx" ON "asset_documents" USING btree ("disposal_id");--> statement-breakpoint

-- Backfill against the asset's Completed disposal.
--
-- Matching on "the asset's only disposal" is too strict: an asset that was
-- rejected once and then disposed properly has two records, and that is exactly
-- the case that produced the reported bug. A disposal certificate is only ever
-- written by the execute-disposal action, which runs on completion -- a
-- Rejected or Pending disposal never produces one -- so the Completed record is
-- the right owner.
--
-- Still guarded by COUNT(*) = 1: an asset with two Completed disposals is
-- genuinely ambiguous, and those rows stay NULL rather than being given a
-- guess. Showing no document is honest; showing one against the wrong disposal
-- is the bug this migration exists to fix.
UPDATE "asset_documents" AS ad
   SET "disposal_id" = completed_disposal.id
  FROM (
    SELECT "asset_id", MIN("id") AS id
      FROM "asset_disposals"
     WHERE "status" = 'Completed'
     GROUP BY "asset_id"
    HAVING COUNT(*) = 1
  ) AS completed_disposal
 WHERE ad."asset_id" = completed_disposal."asset_id"
   AND ad."document_type" = 'disposal-certificate'
   AND ad."disposal_id" IS NULL;--> statement-breakpoint

-- Location assignments were created as 'pending approval' like user
-- assignments, but acceptance matches on assigned_to_user_id, so a location has
-- nobody who can accept and the row stayed pending forever -- inflating every
-- pending count and queue. New ones are now created as 'assigned'; these are
-- the ones already stuck.
UPDATE "asset_assignments"
   SET "state" = 'assigned'
 WHERE "assigned_to_location_id" IS NOT NULL
   AND "assigned_to_user_id" IS NULL
   AND "state" = 'pending approval'
   AND "returned_date" IS NULL;
