-- Deduplicates notification_queue and adds the uniqueness guarantee.
--
-- Guarded because the table does not exist at this point in a database built
-- from zero: notification_queue was only ever created by `drizzle-kit push`,
-- never by a migration, so this file failed outright and took every migration
-- run from an empty database down with it. Migration 0007 creates the table
-- with this index already in place, which is why skipping here is safe.
--
-- On a database that was pushed to, the table exists and this runs as written.
DO $$
BEGIN
  IF to_regclass('public.notification_queue') IS NULL THEN
    RAISE NOTICE 'notification_queue does not exist yet; migration 0007 creates it with this index.';
    RETURN;
  END IF;

  DELETE FROM "notification_queue" AS nq
  USING (
    SELECT
      id,
      row_number() OVER (
        PARTITION BY "assignment_id", "event_type", "recipient_id"
        ORDER BY "created_at", "id"
      ) AS rn
    FROM "notification_queue"
  ) duplicates
  WHERE nq."id" = duplicates."id"
    AND duplicates.rn > 1;

  EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS "notification_queue_assignment_recipient_event_unique" ON "notification_queue" USING btree ("assignment_id","event_type","recipient_id")';
END $$;
