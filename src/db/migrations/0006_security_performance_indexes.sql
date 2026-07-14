CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE INDEX IF NOT EXISTS "users_department_active_idx" ON "users" ("department_id", "is_active");
CREATE INDEX IF NOT EXISTS "asset_purchases_asset_id_idx" ON "asset_purchases" ("asset_id");
CREATE INDEX IF NOT EXISTS "asset_purchases_warranty_expiry_idx" ON "asset_purchases" ("warranty_expiry");
CREATE INDEX IF NOT EXISTS "asset_purchases_purchase_date_idx" ON "asset_purchases" ("purchase_date");
CREATE INDEX IF NOT EXISTS "asset_documents_asset_id_idx" ON "asset_documents" ("asset_id");
CREATE INDEX IF NOT EXISTS "asset_assignments_active_user_idx" ON "asset_assignments" ("assigned_to_user_id", "expected_return_date") WHERE "returned_date" IS NULL;
CREATE INDEX IF NOT EXISTS "maintenance_tickets_asset_status_created_idx" ON "maintenance_tickets" ("asset_id", "status", "created_at");
CREATE INDEX IF NOT EXISTS "maintenance_tickets_status_estimated_return_idx" ON "maintenance_tickets" ("status", "estimated_return_date");
CREATE INDEX IF NOT EXISTS "system_audit_logs_performed_at_id_idx" ON "system_audit_logs" ("performed_at" DESC, "id" DESC);
CREATE INDEX IF NOT EXISTS "system_audit_logs_entity_timeline_idx" ON "system_audit_logs" ("entity_type", "entity_id", "performed_at" DESC);
CREATE INDEX IF NOT EXISTS "system_audit_logs_actor_timeline_idx" ON "system_audit_logs" ("performed_by_id", "performed_at" DESC);
CREATE INDEX IF NOT EXISTS "software_licenses_active_expiry_idx" ON "software_licenses" ("is_active", "expiry_date");
CREATE INDEX IF NOT EXISTS "software_licenses_model_id_idx" ON "software_licenses" ("model_id");
CREATE INDEX IF NOT EXISTS "software_licenses_asset_id_idx" ON "software_licenses" ("asset_id");
CREATE INDEX IF NOT EXISTS "software_allocations_license_revoked_idx" ON "software_allocations" ("license_id", "revoked_at");
CREATE INDEX IF NOT EXISTS "software_allocations_user_revoked_idx" ON "software_allocations" ("assigned_to_user_id", "revoked_at");

CREATE INDEX IF NOT EXISTS "assets_asset_tag_trgm_idx" ON "assets" USING gin ("asset_tag" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "assets_name_trgm_idx" ON "assets" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "assets_serial_number_trgm_idx" ON "assets" USING gin ("serial_number" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "users_name_trgm_idx" ON "users" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "users_email_trgm_idx" ON "users" USING gin ("email" gin_trgm_ops);
