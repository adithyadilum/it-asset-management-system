import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config({ quiet: true });
if (!process.env.DATABASE_URL)
  throw new Error('DATABASE_URL is required for the read-only audit.');
const client = postgres(process.env.DATABASE_URL, {
  max: 1,
  connect_timeout: 10,
  idle_timeout: 2,
  onnotice: () => {},
});
try {
  const report = await client.begin('read only', async (sql) => {
    const [counts] = await sql`
      SELECT
        (SELECT COUNT(*) FROM (SELECT asset_id FROM asset_purchases GROUP BY asset_id HAVING COUNT(*)>1) d)::int AS "assetsWithDuplicatePurchases",
        (SELECT COUNT(*) FROM assets a WHERE NOT EXISTS (SELECT 1 FROM asset_purchases p WHERE p.asset_id=a.id))::int AS "assetsWithoutPurchase",
        (SELECT COUNT(*) FROM asset_purchases WHERE total_cost IS NULL OR total_cost<0 OR purchase_date IS NULL)::int AS "incompletePurchases",
        (SELECT COUNT(*) FROM asset_purchases WHERE currency_code IS NULL OR (currency_code<>'LKR' AND (exchange_rate IS NULL OR exchange_rate<=0 OR exchange_rate=1)))::int AS "unverifiedPurchaseFx",
        (SELECT COUNT(*) FROM assets a JOIN asset_purchases p ON p.asset_id=a.id WHERE a.salvage_value IS NOT NULL AND p.estimated_salvage_value IS NOT NULL AND a.salvage_value<>p.estimated_salvage_value)::int AS "conflictingResidualEstimates",
        (SELECT COUNT(*) FROM (SELECT asset_id FROM asset_assignments WHERE returned_date IS NULL GROUP BY asset_id HAVING COUNT(*)>1) d)::int AS "assetsWithMultipleOpenAssignments",
        (SELECT COUNT(*) FROM asset_assignments WHERE acceptance_status='accepted' AND accepted_at IS NULL)::int AS "acceptedAssignmentsWithoutAcceptanceTime",
        (SELECT COUNT(*) FROM maintenance_tickets WHERE status='COMPLETED' AND (actual_cost IS NULL OR actual_completion_date IS NULL))::int AS "incompleteCompletedRepairs"`;
    const [column] =
      await sql`SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='maintenance_tickets' AND column_name='exchange_rate') AS present`;
    let repairFx = 'Migration 0004 required';
    if (column.present) {
      const [row] =
        await sql`SELECT COUNT(*)::int AS total FROM maintenance_tickets WHERE status='COMPLETED' AND currency_code<>'LKR' AND (exchange_rate IS NULL OR exchange_rate<=0 OR exchange_rate=1)`;
      repairFx = row.total;
    }
    const [history] =
      await sql`SELECT to_regclass('public.financial_memberships') IS NOT NULL AS available`;
    return {
      ...counts,
      unverifiedRepairFx: repairFx,
      financialMembershipHistoryAvailable: history.available,
    };
  });
  console.log(JSON.stringify({ readOnly: true, ...report }, null, 2));
} catch {
  console.error(
    'Read-only financial audit failed. Verify connectivity and apply existing schema migrations before retrying.'
  );
  process.exitCode = 1;
} finally {
  await client.end();
}
