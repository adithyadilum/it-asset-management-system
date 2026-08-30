DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'role' AND e.enumlabel = 'FinanceAuditor'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'role' AND e.enumlabel = 'FinancialAuditor'
  ) THEN
    ALTER TYPE "role" RENAME VALUE 'FinanceAuditor' TO 'FinancialAuditor';
  END IF;
END $$;
