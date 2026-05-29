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
	AND duplicates.rn > 1;--> statement-breakpoint
CREATE UNIQUE INDEX "notification_queue_assignment_recipient_event_unique" ON "notification_queue" USING btree ("assignment_id","event_type","recipient_id");