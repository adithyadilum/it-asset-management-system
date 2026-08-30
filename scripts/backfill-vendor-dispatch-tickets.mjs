/**
 * One-off repair for tickets created by the old vendor-dispatch flow.
 *
 * `initiateVendorRepair` used to close the triage ticket as COMPLETED and
 * insert a second VENDOR ticket whose reportedIssue was overwritten with
 * "Vendor repair dispatch - <vendor>". That left every vendor repair recorded
 * twice — the dispatch row surfacing in Repair History as a finished repair
 * with no cost — and lost the fault the reporter actually described.
 *
 * The action now promotes the triage ticket in place, so new repairs are fine.
 * This script brings existing rows to the same shape:
 *
 *   1. copy the triage ticket's reportedIssue onto the vendor ticket
 *   2. delete the superseded triage row
 *
 * Pairing key: same asset, triage.actual_completion_date == vendor.created_at
 * (the old code stamped both from one `now`), triage closed with the literal
 * "Dispatched to vendor repair" note, vendor issue still the placeholder.
 *
 * Dry run by default. Pass --apply to write.
 *
 *   node scripts/backfill-vendor-dispatch-tickets.mjs
 *   node scripts/backfill-vendor-dispatch-tickets.mjs --apply
 */
import 'dotenv/config';
import postgres from 'postgres';

const apply = process.argv.includes('--apply');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1 });

const pairs = await sql`
  SELECT triage.id            AS triage_id,
         triage.reported_issue AS real_issue,
         vendorTicket.id      AS vendor_id,
         vendorTicket.reported_issue AS placeholder_issue,
         a.asset_tag
  FROM maintenance_tickets triage
  JOIN maintenance_tickets vendorTicket
    ON vendorTicket.asset_id = triage.asset_id
   AND vendorTicket.created_at = triage.actual_completion_date
   AND vendorTicket.ticket_type = 'VENDOR'
  JOIN assets a ON a.id = triage.asset_id
  WHERE triage.ticket_type = 'INTERNAL'
    AND triage.status = 'COMPLETED'
    AND triage.resolution_notes = 'Dispatched to vendor repair'
    AND vendorTicket.reported_issue LIKE 'Vendor repair dispatch%'
  ORDER BY a.asset_tag
`;

if (pairs.length === 0) {
  console.log('Nothing to backfill.');
  await sql.end();
  process.exit(0);
}

console.log(`${apply ? 'Applying' : 'Dry run —'} ${pairs.length} pair(s):\n`);
for (const p of pairs) {
  console.log(`  ${p.asset_tag}`);
  console.log(
    `    ticket ${p.vendor_id} reportedIssue: ${JSON.stringify(p.placeholder_issue)} -> ${JSON.stringify(p.real_issue)}`
  );
  console.log(`    delete superseded dispatch row: ticket ${p.triage_id}`);
}

if (!apply) {
  console.log('\nNo changes written. Re-run with --apply to write.');
  await sql.end();
  process.exit(0);
}

await sql.begin(async (tx) => {
  for (const p of pairs) {
    await tx`
      UPDATE maintenance_tickets
      SET reported_issue = ${p.real_issue}
      WHERE id = ${p.vendor_id}
    `;
    await tx`DELETE FROM maintenance_tickets WHERE id = ${p.triage_id}`;
  }
});

console.log(`\nBackfilled ${pairs.length} pair(s).`);
await sql.end();
