import 'server-only';
import { sql, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import type { PerHeadDataset } from '@/types/per-head-costs';
import { logLatency, startLatencyTimer } from '@/lib/latency';

// Most source timestamps use timestamp WITHOUT time zone and the existing
// driver interprets them as UTC. Financial history uses timestamptz. Preserve
// both conventions explicitly when constructing JSON, independent of DB/session TZ.
const iso = (value: SQL) =>
  sql`to_char(${value}, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;
const expiry = (value: SQL) =>
  iso(
    sql`(${value}::timestamp + interval '1 day') AT TIME ZONE 'Asia/Colombo' AT TIME ZONE 'UTC'`
  );

/** One read-only statement gives every source the same PostgreSQL MVCC snapshot.
 * A transaction's Promise.all still serializes queries on its one connection;
 * the former 14 round trips took ~2 seconds against Neon for this dataset.
 * Monetary inputs stay decimal strings and history is never cached or truncated.
 */
export async function loadPerHeadDataset(
  filters: {
    category?: string;
    pillar?:
      'Hardware' | 'Software' | 'Office Furniture' | 'Office Electronics';
  } = {}
): Promise<PerHeadDataset> {
  const started = startLatencyTimer();
  const conditions: SQL[] = [];
  if (filters.category) conditions.push(sql`c.name = ${filters.category}`);
  if (filters.pillar) conditions.push(sql`c.pillar = ${filters.pillar}`);
  const where = conditions.length
    ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
    : sql``;
  try {
    const result = await db.execute<{ dataset: PerHeadDataset }>(sql`
      WITH scoped_assets AS MATERIALIZED (
        SELECT a.id, a.asset_tag, a.name, a.salvage_value, a.useful_life_months,
               c.name AS category, c.pillar
        FROM assets a
        JOIN models m ON m.id = a.model_id
        JOIN categories c ON c.id = m.category_id
        ${where}
      ), scoped_licenses AS MATERIALIZED (
        SELECT l.id, l.asset_id, l.license_type, l.total_seats, l.expiry_date
        FROM software_licenses l JOIN scoped_assets a ON a.id = l.asset_id
      )
      SELECT json_build_object(
        'people', (SELECT coalesce(json_agg(json_build_object(
          'id', u.id, 'name', u.name, 'email', u.email, 'department', d.name
        ) ORDER BY u.id), '[]'::json) FROM users u LEFT JOIN departments d ON d.id = u.department_id),
        'groups', (SELECT coalesce(json_agg(json_build_object(
          'id', g.id, 'name', g.name, 'departmentId', g.department_id, 'locationId', g.location_id,
          'coverageFrom', ${iso(sql`g.coverage_from AT TIME ZONE 'UTC'`)}
        ) ORDER BY g.id), '[]'::json) FROM financial_groups g),
        'memberships', (SELECT coalesce(json_agg(json_build_object(
          'id', m.id, 'userId', m.user_id, 'groupId', m.group_id, 'reason', m.reason,
          'from', ${iso(sql`m.valid_from AT TIME ZONE 'UTC'`)},
          'to', ${iso(sql`m.valid_to AT TIME ZONE 'UTC'`)}
        ) ORDER BY m.id), '[]'::json) FROM financial_memberships m),
        'policies', (SELECT coalesce(json_agg(json_build_object(
          'id', p.id, 'assetId', p.asset_id, 'groupId', p.group_id, 'shared', p.shared,
          'from', ${iso(sql`p.valid_from AT TIME ZONE 'UTC'`)},
          'to', ${iso(sql`p.valid_to AT TIME ZONE 'UTC'`)}
        ) ORDER BY p.id), '[]'::json) FROM asset_cost_policies p JOIN scoped_assets a ON a.id = p.asset_id),
        'assets', (SELECT coalesce(json_agg(json_build_object(
          'id', a.id, 'tag', a.asset_tag, 'name', a.name, 'category', a.category, 'pillar', a.pillar,
          'purchaseDate', p.purchase_date::text, 'cost', p.total_cost::text,
          'currency', p.currency_code, 'exchangeRate', p.exchange_rate::text,
          'residual', coalesce(a.salvage_value, p.estimated_salvage_value)::text,
          'purchaseResidual', p.estimated_salvage_value::text,
          'lifeMonths', a.useful_life_months, 'purchaseCount', coalesce(p.purchase_count, 0)::int,
          'disposedAt', ${iso(sql`disposal.resolved_at`)},
          'licenseId', l.id, 'licenseType', l.license_type, 'totalSeats', l.total_seats,
          'licenseExpiry', ${expiry(sql`l.expiry_date`)}
        ) ORDER BY a.id), '[]'::json)
          FROM scoped_assets a
          LEFT JOIN LATERAL (
            SELECT p.purchase_date, p.total_cost, p.currency_code, p.exchange_rate,
                   p.estimated_salvage_value, count(*) OVER () AS purchase_count
            FROM asset_purchases p WHERE p.asset_id = a.id ORDER BY p.id DESC LIMIT 1
          ) p ON true
          LEFT JOIN LATERAL (
            SELECT min(d.resolved_at) AS resolved_at FROM asset_disposals d
            WHERE d.asset_id = a.id AND d.status = 'Completed'
          ) disposal ON true
          LEFT JOIN LATERAL (
            SELECT * FROM scoped_licenses l WHERE l.asset_id = a.id ORDER BY l.id LIMIT 1
          ) l ON true),
        'assignments', (SELECT coalesce(json_agg(json_build_object(
          'id', x.id, 'assetId', x.asset_id, 'userId', x.assigned_to_user_id,
          'from', ${iso(sql`x.assigned_date`)}, 'to', ${iso(sql`x.returned_date`)},
          'acceptedAt', ${iso(sql`x.accepted_at`)}, 'acceptanceStatus', x.acceptance_status
        ) ORDER BY x.id), '[]'::json) FROM asset_assignments x JOIN scoped_assets a ON a.id = x.asset_id),
        'terms', (SELECT coalesce(json_agg(json_build_object(
          'id', t.id, 'licenseId', t.license_id, 'assetId', l.asset_id,
          'amount', t.amount::text, 'currency', t.currency_code, 'exchangeRate', t.exchange_rate::text,
          'seats', t.seats, 'allocationLifeMonths', t.allocation_life_months,
          'from', ${iso(sql`t.valid_from AT TIME ZONE 'UTC'`)},
          'to', ${iso(sql`t.valid_to AT TIME ZONE 'UTC'`)}
        ) ORDER BY t.id), '[]'::json) FROM software_financial_terms t JOIN scoped_licenses l ON l.id = t.license_id),
        'softwareAllocations', (SELECT coalesce(json_agg(json_build_object(
          'id', x.id, 'licenseId', x.license_id, 'userId', x.assigned_to_user_id,
          'from', ${iso(sql`x.allocated_at`)}, 'to', ${iso(sql`x.revoked_at`)},
          'expiresAt', ${expiry(sql`l.expiry_date`)}
        ) ORDER BY x.id), '[]'::json) FROM software_allocations x JOIN scoped_licenses l ON l.id = x.license_id),
        'repairs', (SELECT coalesce(json_agg(json_build_object(
          'id', r.id, 'assetId', r.asset_id, 'amount', r.actual_cost::text,
          'currency', r.currency_code, 'exchangeRate', r.exchange_rate::text,
          'completedAt', ${iso(sql`r.actual_completion_date`)}
        ) ORDER BY r.id), '[]'::json) FROM maintenance_tickets r JOIN scoped_assets a ON a.id = r.asset_id WHERE r.status = 'COMPLETED')
      ) AS dataset
    `);
    // postgres-js returns a RowList; neon-serverless returns { rows }.
    const rows = Array.isArray(result)
      ? result
      : (result as { rows: { dataset: PerHeadDataset }[] }).rows;
    return rows[0].dataset;
  } finally {
    logLatency({
      scope: 'DB ACTION',
      label: 'per-head.loadDataset',
      startTime: started,
    });
  }
}
