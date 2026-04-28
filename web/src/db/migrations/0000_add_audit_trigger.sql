-- Custom SQL migration file, put your code below! --
-- 1. Create the function that rejects modifications
CREATE OR REPLACE FUNCTION prevent_audit_tampering()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'TAMPER ALERT: The system_audit_logs table is immutable. UPDATE and DELETE operations are strictly prohibited for compliance.';
END;
$$ LANGUAGE plpgsql;

-- 2. Attach the trigger to your existing audit logs table
CREATE TRIGGER enforce_audit_immutability
BEFORE UPDATE OR DELETE ON system_audit_logs
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_tampering();