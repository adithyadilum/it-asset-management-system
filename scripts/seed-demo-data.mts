/**
 * Rebuilds the database with a realistic demo fleet.
 *
 * Clears every transactional table and the test accounts, then regenerates
 * staff, assets, purchases, assignments, maintenance, disposals and licences
 * with figures that hold up on screen. Master data that was already good
 * (brands, categories, models, vendors, locations, owners) is kept, along with
 * the real team logins -- deleting those would lock people out of Keycloak.
 *
 * Deliberately does NOT touch model images or asset documents; those are added
 * by hand.
 *
 * Everything runs in one transaction, so a dry run rolls back and leaves the
 * database exactly as it was. Re-runnable: it clears what it owns before
 * inserting, so a second run reproduces the same fleet rather than doubling up.
 *
 *   node scripts/seed-demo-data.mts            # dry run, reports and rolls back
 *   node scripts/seed-demo-data.mts --apply    # writes
 */
import 'dotenv/config';
import postgres from 'postgres';

const APPLY = process.argv.includes('--apply');
const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 1 });

/** Team logins that must survive -- these people present the demo. */
const KEEP_EMAILS = [
  'adithyadilum11@gmail.com',
  'chamokarunarathne27@gmail.com',
  'chathunik27@gmail.com',
  'hasinikahlt@gmail.com',
  'tharu.muthu69@gmail.com',
];

// Deterministic pseudo-randomness: the same seed gives the same fleet, so a
// re-run after a mistake reproduces exactly what was reviewed.
let seed = 20260901;
const rand = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};
// Trailing comma required: in .mts a bare `<T>` arrow parses as JSX.
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];
const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
const dateOnly = (d: Date) => d.toISOString().slice(0, 10);

const STAFF: Array<[string, string]> = [
  ['Nuwan Perera', 'IT'],
  ['Dilani Fernando', 'Finance'],
  ['Kasun Silva', 'IT'],
  ['Amaya Jayawardena', 'HR'],
  ['Ruwan Bandara', 'Operations'],
  ['Ishara Wickramasinghe', 'Sales'],
  ['Sanduni Rajapaksa', 'Finance'],
  ['Chathura Gunasekara', 'IT'],
  ['Nadeesha Ekanayake', 'Marketing'],
  ['Malith Senanayake', 'Operations'],
  ['Tharindu Weerasinghe', 'IT'],
  ['Hiruni Dissanayake', 'HR'],
  ['Lahiru Mendis', 'Sales'],
  ['Sachini Herath', 'Finance'],
  ['Dinesh Abeywickrama', 'Operations'],
  ['Piumi Ratnayake', 'Marketing'],
  ['Kavinda Samarasinghe', 'IT'],
  ['Nethmi Liyanage', 'HR'],
  ['Supun Karunaratne', 'Sales'],
  ['Rashmi Peiris', 'Operations'],
];

/** Unit cost in LKR, keyed by model name. Sri Lankan market prices. */
const PRICE_LKR: Record<string, number> = {
  'MacBook Pro 16"': 1_250_000,
  'XPS 15 9520': 850_000,
  'Vostro 3600': 320_000,
  '27UN850-W 4K': 215_000,
  'PowerEdge R750': 3_400_000,
  'Color LaserJet Pro M479fdw': 165_000,
  'Pro EX9240 1080p': 285_000,
  'MeetUp 4K': 310_000,
  'Powershred 99Ci': 92_000,
  'Gesture Office Chair': 195_000,
  'Renew Sit-to-Stand': 265_000,
  '3-Drawer Lateral': 88_000,
  'Framery O': 2_950_000,
  'Windows 11 Pro': 62_000,
  'Windows Server 2022 DataCenter': 1_850_000,
  'All Products Pack': 98_000,
  'Creative Cloud': 145_000,
  '1Password Business': 24_000,
};

/** Model, asset-tag prefix, how many to create. */
const FLEET: Array<[string, string, number]> = [
  ['XPS 15 9520', 'LAP', 8],
  ['MacBook Pro 16"', 'MBP', 4],
  ['Vostro 3600', 'DES', 6],
  ['27UN850-W 4K', 'MON', 10],
  ['PowerEdge R750', 'SRV', 4],
  ['Color LaserJet Pro M479fdw', 'PRN', 3],
  ['Pro EX9240 1080p', 'PRJ', 2],
  ['MeetUp 4K', 'CCM', 3],
  ['Powershred 99Ci', 'SRD', 2],
  ['Gesture Office Chair', 'CHR', 5],
  ['Renew Sit-to-Stand', 'DSK', 4],
  ['3-Drawer Lateral', 'CAB', 2],
  ['Framery O', 'POD', 1],
  ['Windows 11 Pro', 'OSS', 1],
  ['Windows Server 2022 DataCenter', 'SRL', 1],
  ['All Products Pack', 'IDE', 1],
  ['Creative Cloud', 'ADB', 1],
  ['1Password Business', 'PWM', 1],
];

/**
 * Faults that actually make sense for the thing being repaired.
 *
 * A single shared pool put "battery drains within two hours" against a printer,
 * which is exactly the detail an audience notices.
 */
const ISSUES_BY_CATEGORY: Record<string, string[]> = {
  Laptop: [
    'Screen flickers intermittently under load.',
    'Battery drains within two hours of a full charge.',
    'Fan runs constantly and the chassis is hot to touch.',
    'Keyboard backlight and three keys are unresponsive.',
    'Docking port no longer detects external displays.',
  ],
  Desktop: [
    'Will not power on after the last office move.',
    'Fan runs constantly and the chassis is hot to touch.',
    'Random restarts under sustained load.',
  ],
  Monitor: [
    'Screen flickers intermittently under load.',
    'Vertical line down the left third of the panel.',
    'Backlight is visibly uneven at low brightness.',
  ],
  'Rack server': [
    'Redundant power supply reporting a fault.',
    'Drive bay 3 dropped out of the array.',
    'Chassis fan alarm on every boot.',
  ],
  Printer: [
    'Paper feed jams on every duplex job.',
    'Streaking down the page after a toner change.',
    'Reports a fuser error and stops mid-job.',
  ],
  Projector: [
    'Lens focus motor stalls at the wide end.',
    'Lamp hours exhausted and image is dim.',
  ],
  'Conference Camera': [
    'Auto-framing drifts and will not recentre.',
    'Microphone array cuts out mid-call.',
  ],
  Shredder: [
    'Jams and reverses on more than four sheets.',
    'Motor cuts out after a few minutes of use.',
  ],
};

const GENERIC_ISSUES = [
  'Intermittent fault reported by the custodian.',
  'Stopped working after the last office move.',
];

const issueFor = (category: string) =>
  pick(ISSUES_BY_CATEGORY[category] ?? GENERIC_ISSUES);

const RESOLUTIONS = [
  'Replaced the display panel and recalibrated colour.',
  'Battery replaced and firmware updated.',
  'Thermal paste reapplied and heatsink cleared.',
  'Keyboard assembly swapped under warranty.',
  'Main board replaced.',
  'Feed rollers replaced and firmware updated.',
];

class DryRun extends Error {}

async function run() {
  const summary: string[] = [];

  try {
    await sql.begin(async (tx) => {
      // ── 1. Clear transactional data, children first ─────────────────────
      const wipe = [
        'notification_logs',
        'notification_queue',
        'app_notifications',
        'system_audit_logs',
        'linked_devices',
        'user_refresh_tokens',
        'software_allocations',
        'asset_documents',
        'asset_disposals',
        'maintenance_tickets',
        'asset_assignments',
        'software_licenses',
        'asset_purchases',
        'assets',
        'sessions',
      ];
      let cleared = 0;
      for (const t of wipe) {
        const r = await tx.unsafe(`DELETE FROM "${t}" RETURNING 1`);
        cleared += r.length;
      }
      summary.push(`cleared ${cleared} rows from ${wipe.length} tables`);

      const killedKeys = await tx`
        DELETE FROM api_keys WHERE name = 'kkkkkkk' RETURNING 1`;
      summary.push(`removed ${killedKeys.length} junk api key(s)`);

      // ── 2. Test accounts ────────────────────────────────────────────────
      // Config tables outlive the wipe and point at whoever created the row.
      // Those columns are RESTRICT, so ownership moves to a surviving admin
      // before the test accounts go, rather than the delete failing.
      const [keeper] = await tx<{ id: string }[]>`
        SELECT id FROM users
        WHERE email = ANY(${KEEP_EMAILS}) AND role = 'GlobalAdmin'
        ORDER BY email LIMIT 1`;
      if (!keeper) throw new Error('no surviving GlobalAdmin to reassign to');

      for (const [table, col] of [
        ['api_keys', 'created_by_id'],
        ['custom_statuses', 'created_by_id'],
        ['notification_rules', 'updated_by_id'],
        ['report_templates', 'created_by_id'],
        ['webhook_subscriptions', 'created_by_id'],
      ] as const) {
        await tx.unsafe(
          `UPDATE "${table}" SET "${col}" = $1
           WHERE "${col}" IS NOT NULL AND "${col}" <> ALL($2)`,
          [keeper.id, [keeper.id]]
        );
      }

      const removed = await tx`
        DELETE FROM users WHERE email <> ALL(${KEEP_EMAILS}) RETURNING email`;
      summary.push(`removed ${removed.length} non-team accounts`);

      // ── 3. Departments ──────────────────────────────────────────────────
      const DEPTS: Array<[string, string, string]> = [
        ['IT', 'IT', 'CC-100'],
        ['Finance', 'FIN', 'CC-200'],
        ['HR', 'HRR', 'CC-300'],
        ['Operations', 'OPS', 'CC-400'],
        ['Sales', 'SLS', 'CC-500'],
        ['Marketing', 'MKT', 'CC-600'],
      ];
      for (const [name, short, cc] of DEPTS) {
        await tx`
          INSERT INTO departments (name, short_code, cost_center_id, is_active)
          VALUES (${name}, ${short}, ${cc}, true)
          ON CONFLICT (name) DO UPDATE SET is_active = true`;
      }
      const depts = await tx<{ id: number; name: string }[]>`
        SELECT id, name FROM departments`;
      const deptId = (n: string) => depts.find((d) => d.name === n)!.id;
      summary.push(`departments: ${depts.length}`);

      // ── 4. Staff ────────────────────────────────────────────────────────
      const staff: Array<{ id: string; name: string }> = [];
      for (const [name, dept] of STAFF) {
        const [first, last] = name.toLowerCase().split(' ');
        const [row] = await tx<{ id: string }[]>`
          INSERT INTO users (name, email, role, is_active, department_id)
          VALUES (${name}, ${`${first}.${last}@tiqri.com`}, 'Employee', true, ${deptId(dept)})
          RETURNING id`;
        staff.push({ id: row.id, name });
      }
      // The financials module is gated to GlobalAdmin and FinancialAuditor, so
      // the demo needs someone holding that role to show it from.
      await tx`
        UPDATE users SET role = 'FinancialAuditor'
        WHERE email = 'dilani.fernando@tiqri.com'`;

      const team = await tx<{ id: string; name: string }[]>`
        SELECT id, name FROM users WHERE email = ANY(${KEEP_EMAILS}) ORDER BY name`;
      const adminId = team[0].id;
      // Everyone who can hold an asset.
      const holders = [...staff, ...team];
      summary.push(`staff added: ${staff.length}, team kept: ${team.length}`);

      // ── 5. Assets and purchases ─────────────────────────────────────────
      const models = await tx<
        { id: number; name: string; pillar: string; category: string }[]
      >`SELECT m.id, m.name, c.pillar, c.name AS category FROM models m JOIN categories c ON c.id = m.category_id`;
      const locations = await tx<{ id: number; name: string }[]>`
        SELECT id, name FROM locations WHERE is_active = true`;
      const vendors = await tx<{ id: number }[]>`SELECT id FROM vendors`;
      const [owner] = await tx<{ id: number }[]>`SELECT id FROM owners LIMIT 1`;

      const conditions = ['New', 'Excellent', 'Fair', 'Poor'] as const;
      type Made = {
        id: string;
        tag: string;
        pillar: string;
        modelId: number;
        modelName: string;
        category: string;
        purchasedDaysAgo: number;
        cost: number;
      };
      const made: Made[] = [];

      for (const [modelName, prefix, count] of FLEET) {
        const model = models.find((m) => m.name === modelName);
        if (!model) throw new Error(`model not found: ${modelName}`);
        const unit = PRICE_LKR[modelName];
        if (!unit) throw new Error(`no price for: ${modelName}`);
        const isSoftware = model.pillar === 'Software';

        for (let i = 1; i <= count; i++) {
          const tag = `${prefix}-${String(i).padStart(3, '0')}`;
          const purchasedDaysAgo = int(30, 1100);
          const purchaseDate = daysAgo(purchasedDaysAgo);

          const [asset] = await tx<{ id: string }[]>`
            INSERT INTO assets (asset_tag, serial_number, name, model_id, location_id, owner_id, status, condition, useful_life_months, is_archived, created_at, updated_at)
            VALUES (
              ${tag},
              ${isSoftware ? null : `${prefix}${int(100000, 999999)}SL`},
              ${modelName}, ${model.id},
              ${isSoftware ? null : pick(locations).id},
              ${owner.id}, 'Available',
              ${isSoftware ? null : pick(conditions)},
              ${isSoftware ? 36 : 60}, false,
              ${purchaseDate}, ${daysAgo(int(0, 20))}
            ) RETURNING id`;

          const base = Math.round(unit * (0.94 + rand() * 0.12));
          const tax = Math.round(base * 0.18);
          const shipping = isSoftware ? 0 : int(2000, 15000);
          await tx`
            INSERT INTO asset_purchases (asset_id, vendor_id, purchase_date, base_price, tax, shipping_cost, total_cost, currency_code, exchange_rate, warranty_expiry, estimated_salvage_value)
            VALUES (
              ${asset.id}, ${pick(vendors).id}, ${dateOnly(purchaseDate)},
              ${base}, ${tax}, ${shipping}, ${base + tax + shipping}, 'LKR', 1,
              ${isSoftware ? null : dateOnly(new Date(purchaseDate.getTime() + 730 * 86_400_000))},
              ${Math.round(base * 0.12)}
            )`;

          made.push({
            id: asset.id,
            tag,
            pillar: model.pillar,
            modelId: model.id,
            modelName,
            category: model.category,
            purchasedDaysAgo,
            cost: base + tax + shipping,
          });
        }
      }
      summary.push(`assets: ${made.length}`);

      // ── 6. Software licences and seat allocations ───────────────────────
      const softwareAssets = made.filter((m) => m.pillar === 'Software');
      const seatsFor: Record<string, number> = {
        'Windows 11 Pro': 45,
        'Windows Server 2022 DataCenter': 4,
        'All Products Pack': 12,
        'Creative Cloud': 8,
        '1Password Business': 40,
      };
      let allocations = 0;
      for (const s of softwareAssets) {
        const total = seatsFor[s.modelName] ?? 10;
        const perpetual = s.modelName.startsWith('Windows');
        const start = daysAgo(s.purchasedDaysAgo);
        // One licence is deliberately expired so Renew has something to act on.
        const expired = s.modelName === 'Creative Cloud';
        const [lic] = await tx<{ id: string }[]>`
          INSERT INTO software_licenses (model_id, asset_id, license_key, license_type, total_seats, start_date, expiry_date, is_active)
          VALUES (
            ${s.modelId}, ${s.id},
            ${`${s.modelName.slice(0, 3).toUpperCase()}-${int(10000, 99999)}-${int(10000, 99999)}-${int(10000, 99999)}`},
            ${perpetual ? 'Perpetual' : 'Subscription'},
            ${total}, ${dateOnly(start)},
            ${perpetual ? null : dateOnly(expired ? daysAgo(21) : daysAgo(-int(45, 300)))},
            true
          ) RETURNING id`;

        const seatsUsed = Math.min(
          total,
          int(Math.floor(total * 0.4), total - 1)
        );
        // Shuffled, so seats are spread across the org rather than always
        // landing on the first few people in the list.
        const shuffled = [...holders].sort(() => rand() - 0.5);
        for (const h of shuffled.slice(0, seatsUsed)) {
          await tx`
            INSERT INTO software_allocations (license_id, assigned_to_user_id, allocated_at)
            VALUES (${lic.id}, ${h.id}, ${daysAgo(int(5, 400))})`;
          allocations++;
        }
      }
      summary.push(
        `software licences: ${softwareAssets.length} (1 expired), seat allocations: ${allocations}`
      );

      // ── 7. Assignments, and the statuses that follow from them ──────────
      const physical = made.filter((m) => m.pillar !== 'Software');
      const locationPillars = ['Office Furniture', 'Office Electronics'];
      let assignedCount = 0;

      // Most of the fleet is out in the business. The rest has to cover every
      // other state -- in repair, repeat repairs, triage, disposals, lost and
      // retired -- so the rate is tuned to leave enough behind for all of them.
      const toAssign = physical.filter(() => rand() < 0.58);
      for (const a of toAssign) {
        const toLocation = locationPillars.includes(a.pillar);
        const assignedDaysAgo = int(5, Math.min(a.purchasedDaysAgo, 500));
        await tx`
          INSERT INTO asset_assignments (asset_id, assigned_to_user_id, assigned_to_location_id, assigned_by_id, assigned_date, expected_return_date, state, acceptance_status, accepted_at)
          VALUES (
            ${a.id},
            ${toLocation ? null : pick(holders).id},
            ${toLocation ? pick(locations).id : null},
            ${adminId},
            ${daysAgo(assignedDaysAgo)},
            ${toLocation ? null : dateOnly(daysAgo(-int(30, 400)))},
            'assigned', 'accepted', ${daysAgo(assignedDaysAgo - 1)}
          )`;
        await tx`UPDATE assets SET status='Assigned' WHERE id=${a.id}`;
        assignedCount++;
      }

      // A couple of overdue returns so the dashboard table has content.
      const overdue = toAssign
        .filter((a) => !locationPillars.includes(a.pillar))
        .slice(0, 3);
      for (const a of overdue) {
        await tx`
          UPDATE asset_assignments
          SET state='overdue', expected_return_date=${dateOnly(daysAgo(int(4, 30)))}
          WHERE asset_id=${a.id}`;
      }
      summary.push(
        `assignments: ${assignedCount} (${overdue.length} overdue, ${assignedCount - overdue.length} current)`
      );

      // ── 8. Maintenance ──────────────────────────────────────────────────
      const repairable = physical.filter((a) => !toAssign.includes(a));
      const inRepair = repairable.slice(0, 4);
      const repaired = repairable.slice(4, 11);
      let tickets = 0;

      for (const a of inRepair) {
        const openedDaysAgo = int(2, 25);
        await tx`
          INSERT INTO maintenance_tickets (asset_id, ticket_type, vendor_name, rma_number, reported_issue, estimated_cost, currency_code, estimated_return_date, status, dispatched_by_id, created_at, updated_at)
          VALUES (
            ${a.id}, 'VENDOR', 'Dell Technologies', ${`RMA-${int(100000, 999999)}`},
            ${issueFor(a.category)}, ${int(15000, 90000)}, 'LKR',
            ${dateOnly(daysAgo(-int(5, 25)))}, 'ACTIVE', ${adminId},
            ${daysAgo(openedDaysAgo)}, ${daysAgo(openedDaysAgo)}
          )`;
        await tx`UPDATE assets SET status='In Repair' WHERE id=${a.id}`;
        tickets++;
      }

      for (const a of repaired) {
        const openedDaysAgo = int(40, 400);
        const closedDaysAgo = openedDaysAgo - int(3, 20);
        const cost = int(12000, 120000);
        await tx`
          INSERT INTO maintenance_tickets (asset_id, ticket_type, vendor_name, rma_number, reported_issue, resolution_notes, estimated_cost, actual_cost, currency_code, actual_completion_date, status, dispatched_by_id, created_at, updated_at)
          VALUES (
            ${a.id}, 'VENDOR', 'Atlas Tech Services', ${`RMA-${int(100000, 999999)}`},
            ${issueFor(a.category)}, ${pick(RESOLUTIONS)},
            ${cost}, ${cost}, 'LKR',
            ${daysAgo(closedDaysAgo)}, 'COMPLETED', ${adminId},
            ${daysAgo(openedDaysAgo)}, ${daysAgo(closedDaysAgo)}
          )`;
        tickets++;
      }

      // Two assets with a repeat history. The dashboard's High-Maintenance tab
      // only lists assets at or above HIGH_MAINTENANCE_TICKET_THRESHOLD (3),
      // so without these it renders empty.
      for (const a of repairable.slice(12, 14)) {
        for (let k = 0; k < int(3, 4); k++) {
          const openedDaysAgo = int(60, 600);
          const closedDaysAgo = Math.max(1, openedDaysAgo - int(4, 25));
          const cost = int(18000, 140000);
          await tx`
            INSERT INTO maintenance_tickets (asset_id, ticket_type, vendor_name, rma_number, reported_issue, resolution_notes, estimated_cost, actual_cost, currency_code, actual_completion_date, status, dispatched_by_id, created_at, updated_at)
            VALUES (
              ${a.id}, 'VENDOR', 'Atlas Tech Services', ${`RMA-${int(100000, 999999)}`},
              ${issueFor(a.category)}, ${pick(RESOLUTIONS)},
              ${cost}, ${cost}, 'LKR',
              ${daysAgo(closedDaysAgo)}, 'COMPLETED', ${adminId},
              ${daysAgo(openedDaysAgo)}, ${daysAgo(closedDaysAgo)}
            )`;
          tickets++;
        }
      }

      // One sitting in triage, so the Pending Review tab is not empty.
      const triage = repairable[11];
      if (triage) {
        await tx`
          INSERT INTO maintenance_tickets (asset_id, ticket_type, reported_issue, status, dispatched_by_id, created_at, updated_at)
          VALUES (${triage.id}, 'INTERNAL', ${issueFor(triage.category)}, 'ACTIVE', ${adminId}, ${daysAgo(3)}, ${daysAgo(3)})`;
        tickets++;
      }
      summary.push(
        `maintenance tickets: ${tickets} (${inRepair.length} at vendor, ${repaired.length} closed, 1 in triage)`
      );

      // ── 9. Disposals ────────────────────────────────────────────────────
      const disposalPool = repairable.slice(14);
      const completed = disposalPool.slice(0, 3);
      const pending = disposalPool.slice(3, 5);
      let disposals = 0;

      for (const a of completed) {
        const when = int(20, 300);
        await tx`
          INSERT INTO asset_disposals (asset_id, requested_by_id, approved_by_id, status, reason, justification, disposal_method, data_wiped, tags_removed, actual_salvage_value, book_value_at_disposal, requested_at, resolved_at)
          VALUES (
            ${a.id}, ${adminId}, ${adminId}, 'Completed', 'Obsolete',
            'Past its useful life and no longer supported by the vendor.',
            'E-waste', true, true,
            ${Math.round(a.cost * 0.08)}, ${Math.round(a.cost * 0.15)},
            ${daysAgo(when)}, ${daysAgo(when - int(2, 10))}
          )`;
        await tx`UPDATE assets SET status='Disposed', is_archived=true WHERE id=${a.id}`;
        disposals++;
      }

      for (const a of pending) {
        await tx`
          INSERT INTO asset_disposals (asset_id, requested_by_id, status, reason, justification, requested_at)
          VALUES (
            ${a.id}, ${adminId}, 'Pending Approval', 'Damaged',
            'Chassis cracked beyond economical repair after a drop.',
            ${daysAgo(int(2, 12))}
          )`;
        await tx`UPDATE assets SET status='Pending Disposal' WHERE id=${a.id}`;
        disposals++;
      }

      // One lost, one retired, for a believable status spread.
      const lost = disposalPool[5];
      if (lost) await tx`UPDATE assets SET status='Lost' WHERE id=${lost.id}`;
      const retired = disposalPool[6];
      if (retired)
        await tx`UPDATE assets SET status='Retired' WHERE id=${retired.id}`;
      // One reported faulty but not yet triaged, so the donut shows the state.
      const defective = disposalPool[7];
      if (defective)
        await tx`UPDATE assets SET status='Defective', condition='Damaged' WHERE id=${defective.id}`;
      summary.push(
        `disposals: ${disposals} (${completed.length} completed, ${pending.length} awaiting approval)`
      );

      // ── 10. A believable recent audit trail ─────────────────────────────
      let audits = 0;
      for (const a of made.slice(0, 40)) {
        await tx`
          INSERT INTO system_audit_logs (entity_type, entity_id, action_type, performed_by_id, new_value, performed_at)
          VALUES ('Asset', ${a.id}, 'CREATE', ${adminId}, ${sql.json({ assetTag: a.tag })}, ${daysAgo(a.purchasedDaysAgo)})`;
        audits++;
      }
      for (const h of holders.slice(0, 12)) {
        await tx`
          INSERT INTO system_audit_logs (entity_type, entity_id, action_type, performed_by_id, new_value, performed_at)
          VALUES ('sessions', ${h.id}, 'LOGIN', ${h.id}, ${sql.json({ name: h.name })}, ${daysAgo(int(0, 6))})`;
        audits++;
      }
      summary.push(`audit entries: ${audits}`);

      // ── 11. A few notifications so the bell has something in it ─────────
      let notes = 0;
      const noteSeed: Array<[string, string, string]> = [
        [
          'Warranty expiring',
          'The warranty on MON-004 expires in 21 days.',
          'WARRANTY_EXPIRY',
        ],
        [
          'Licence renewal due',
          'Adobe Creative Cloud expired 21 days ago and needs renewing.',
          'SOFTWARE_LICENSE_RENEWAL',
        ],
        [
          'Return overdue',
          'A laptop assigned to Kasun Silva is past its expected return date.',
          'RETURN_OVERDUE',
        ],
        [
          'Repair completed',
          'Atlas Tech Services returned an asset from repair.',
          'MAINTENANCE_COMPLETED',
        ],
        [
          'Disposal awaiting approval',
          'Two assets are waiting on a disposal decision.',
          'DISPOSAL_REQUEST',
        ],
      ];
      for (const t of team) {
        for (const [title, message, event] of noteSeed) {
          await tx`
            INSERT INTO app_notifications (user_id, title, message, target_url, is_read, event_type, created_at)
            VALUES (${t.id}, ${title}, ${message}, '/dashboard', ${rand() < 0.4}, ${event}, ${daysAgo(int(0, 9))})`;
          notes++;
        }
      }
      summary.push(`notifications: ${notes}`);

      const [{ n: finalAssets }] = await tx<{ n: number }[]>`
        SELECT count(*)::int AS n FROM assets`;
      const statuses = await tx<{ status: string; n: number }[]>`
        SELECT status, count(*)::int AS n FROM assets GROUP BY status ORDER BY n DESC`;
      summary.push(
        `\nfinal fleet (${finalAssets}): ` +
          statuses.map((s) => `${s.status}=${s.n}`).join('  ')
      );

      if (!APPLY) throw new DryRun();
    });
  } catch (err) {
    if (!(err instanceof DryRun)) throw err;
  }

  console.log(summary.join('\n'));
  console.log(
    APPLY ? '\nApplied.' : '\nDry run — rolled back. Pass --apply to write.'
  );
}

await run();
await sql.end();
