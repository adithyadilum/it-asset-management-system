/** Exhibition fixture: coherent operating history, never runtime financial defaults.
 * node scripts/seed-financial-demo.mjs          validates then rolls back
 * node scripts/seed-financial-demo.mjs --apply  snapshots affected tables and commits
 * Login identities, model images, licence keys and disposal documents are retained.
 * Prices and FX below are illustrative procurement assumptions, not market quotes.
 */
import dotenv from 'dotenv';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

const DAY = 86400000,
  OFFSET = 330 * 60000;
const date = (ms) => new Date(Number(ms) + OFFSET).toISOString().slice(0, 10);
const midnight = (text) => Date.parse(`${text}T00:00:00+05:30`);
const iso = (ms) => new Date(ms).toISOString();
const month = (ms, offset = 0) => {
  const d = new Date(ms + OFFSET);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + offset, 1) - OFFSET;
};
const money = (value) => Number(value).toFixed(2);
const BACKUP_TABLES = [
  'users',
  'assets',
  'asset_purchases',
  'asset_assignments',
  'asset_disposals',
  'maintenance_tickets',
  'software_licenses',
  'software_allocations',
  'financial_groups',
  'financial_memberships',
  'asset_cost_policies',
  'software_financial_terms',
  'notification_queue',
  'system_audit_logs',
];

function equipmentPrice(category, name) {
  if (/Laptop/i.test(category))
    return /MacBook/i.test(name)
      ? 620000
      : /ThinkPad/i.test(name)
        ? 395000
        : 285000;
  if (/Desktop/i.test(category)) return /Mac/i.test(name) ? 420000 : 235000;
  if (/Monitor/i.test(category))
    return /UltraSharp|4K|32/i.test(name) ? 145000 : 68000;
  if (/Dock/i.test(category)) return 54000;
  if (/Headphone/i.test(category)) return 38000;
  if (/Tablet/i.test(category)) return 185000;
  if (/server/i.test(category)) return 1850000;
  if (/Storage/i.test(category)) return 520000;
  if (/Firewall/i.test(category)) return 365000;
  if (/Switch/i.test(category)) return 175000;
  if (/Chair/i.test(category))
    return /Herman|Aeron|Steelcase|Sayl/i.test(name) ? 225000 : 58000;
  if (/Desk/i.test(category)) return 89000;
  if (/Meeting Table/i.test(category)) return 185000;
  if (/Pod/i.test(category)) return 4200000;
  if (/Cabinet|Locker|Bookshelf/i.test(category)) return 72000;
  if (/Whiteboard/i.test(category)) return 32000;
  if (/Printer/i.test(category)) return 115000;
  if (/Projector/i.test(category)) return 245000;
  if (/TV/i.test(category)) return 195000;
  if (/Camera/i.test(category)) return 145000;
  if (/UPS/i.test(category)) return 85000;
  if (/Phone/i.test(category)) return 34000;
  if (/Shredder/i.test(category)) return 62000;
  if (/Scanner/i.test(category)) return 125000;
  return 98000;
}
function maintenanceWork(category) {
  if (/Chair/i.test(category))
    return [
      'Seat height drops during use; gas lift replacement requested.',
      'Gas lift and worn castors replaced; height adjustment and stability verified.',
    ];
  if (/Desk|Table|Cabinet|Locker|Bookshelf|Whiteboard|Pod/i.test(category))
    return [
      'Loose fittings and worn hinges found during workplace inspection.',
      'Worn fittings replaced and fasteners secured; alignment and safe operation checked.',
    ];
  if (/Printer|Scanner|Shredder/i.test(category))
    return [
      'Repeated paper-feed jams and worn rollers reported.',
      'Feed rollers replaced and mechanism serviced; consecutive test runs passed.',
    ];
  if (/UPS/i.test(category))
    return [
      'Backup runtime is below the required duration.',
      'Battery pack replaced; load and failover tests passed.',
    ];
  if (/Laptop|Tablet/i.test(category))
    return [
      'Battery runtime is reduced and the charging connector is intermittent.',
      'Battery and charging connector replaced; charging cycle and diagnostics passed.',
    ];
  if (/Monitor|TV|Projector/i.test(category))
    return [
      'Display flickers intermittently after warming up.',
      'Power module repaired; display passed extended image and calibration tests.',
    ];
  if (/Switch|Firewall|server|Storage/i.test(category))
    return [
      'Intermittent faults detected during infrastructure health checks.',
      'Faulty power module replaced and firmware verified; extended stability checks passed.',
    ];
  return [
    'Intermittent power failure reported during normal use.',
    'Power supply repaired and connections secured; electrical safety and stability checks passed.',
  ];
}
function softwarePlan(name, people) {
  const cap = people.length;
  if (/1Password/i.test(name))
    return {
      seats: Math.max(40, cap),
      assigned: Math.max(1, cap - 2),
      price: 8,
      annual: true,
      renewal: 6,
    };
  if (/All Products|JetBrains/i.test(name))
    return {
      seats: 15,
      assigned: Math.min(12, cap),
      price: 65,
      annual: true,
      renewal: 3,
      department: 'IT',
    };
  if (/AutoCAD/i.test(name))
    return {
      seats: 6,
      assigned: Math.min(4, cap),
      price: 165,
      annual: true,
      renewal: 10,
      department: 'Operations',
    };
  if (/Creative/i.test(name))
    return {
      seats: 8,
      assigned: Math.min(5, cap),
      price: 60,
      annual: false,
      department: 'Marketing',
    };
  if (/Falcon/i.test(name))
    return {
      seats: Math.max(40, cap),
      assigned: Math.max(1, cap - 1),
      price: 9,
      annual: true,
      renewal: 10,
    };
  if (/Confluence/i.test(name))
    return {
      seats: Math.max(30, cap - 3),
      assigned: Math.max(1, cap - 5),
      price: 10,
      annual: false,
    };
  if (/Workplace/i.test(name))
    return {
      seats: Math.max(40, cap),
      assigned: Math.max(1, cap - 1),
      price: 12.5,
      annual: false,
    };
  if (/Backup/i.test(name))
    return {
      seats: 8,
      assigned: Math.min(4, cap),
      price: 35,
      annual: true,
      renewal: 0,
      department: 'IT',
    };
  if (/SQL Server/i.test(name))
    return {
      seats: 4,
      assigned: Math.min(2, cap),
      price: 1100,
      perpetual: true,
      life: 60,
      department: 'IT',
    };
  if (/Windows Server/i.test(name))
    return {
      seats: 4,
      assigned: Math.min(2, cap),
      price: 5400,
      perpetual: true,
      life: 60,
      department: 'IT',
    };
  if (/Windows 11/i.test(name))
    return {
      seats: Math.max(45, cap),
      assigned: Math.max(1, cap - 6),
      price: 180,
      perpetual: true,
      life: 36,
    };
  return {
    seats: Math.max(5, cap),
    assigned: Math.max(1, cap - 1),
    price: 12,
    annual: true,
    renewal: 0,
  };
}

export async function seedFinancialDemo(q, { asOf = '2026-11-05' } = {}) {
  const now = midnight(asOf) + 16 * 3600000,
    start = month(now, -18);
  const people =
    await q`SELECT u.*,d.name AS department FROM users u LEFT JOIN departments d ON d.id=u.department_id WHERE u.is_active ORDER BY u.name,u.id`;
  if (!people.length)
    throw new Error('Seed requires existing active demo people.');
  const actor = people.find((p) => p.role === 'GlobalAdmin') ?? people[0];
  let workplaces =
    await q`SELECT id,name FROM locations WHERE is_active ORDER BY id`;
  if (!workplaces.length)
    workplaces =
      await q`INSERT INTO locations(name,type) VALUES('Colombo HQ','HQ'),('IT Floor','Floor'),('Finance Floor','Floor'),('Colombo Branch','Branch'),('Galle Remote Office','Remote'),('Repair Lab','Room'),('Warehouse Staging','Room') RETURNING id,name`;
  const findLocation = (pattern) =>
    workplaces.find((l) => pattern.test(l.name)) ?? workplaces[0];
  const hq = findLocation(/Colombo HQ/i),
    it = findLocation(/IT Floor/i),
    finance = findLocation(/Finance Floor/i),
    branch = findLocation(/Colombo Branch/i),
    remote = findLocation(/Galle/i),
    warehouse = findLocation(/Warehouse/i),
    lab = findLocation(/Repair Lab/i);
  const departments =
    await q`SELECT id,name FROM departments WHERE is_active ORDER BY id`;
  if (!departments.length) throw new Error('Seed requires departments.');
  const personInfo = new Map();
  people.forEach((p, i) => {
    const department = p.department ?? departments[0].name;
    const workplace = /Finance/i.test(department)
      ? finance
      : /^IT$/i.test(department)
        ? i % 6 === 0
          ? remote
          : it
        : /Sales|Operations/i.test(department)
          ? i % 3 === 0
            ? remote
            : branch
          : hq;
    const hired =
      i < Math.max(1, people.length - 7)
        ? month(start, -((i % 5) + 2))
        : month(now, -(people.length - i));
    const move = month(now, -(i % 2 === 0 ? 6 : 3));
    personInfo.set(p.id, {
      hired,
      workplace,
      departmentId: p.department_id ?? departments[0].id,
      move: i % 9 === 0 && hired < move ? move : null,
    });
  });
  // Financial history is regenerated as one coherent dataset; access identities stay intact.
  await q`DELETE FROM financial_memberships`;
  await q`DELETE FROM asset_cost_policies`;
  await q`DELETE FROM software_financial_terms`;
  await q`INSERT INTO financial_groups(name,department_id,coverage_from) SELECT name,id,${iso(start)}::timestamptz FROM departments ON CONFLICT(department_id) DO UPDATE SET name=EXCLUDED.name,coverage_from=EXCLUDED.coverage_from`;
  await q`INSERT INTO financial_groups(name,location_id,coverage_from) SELECT name,id,${iso(start)}::timestamptz FROM locations ON CONFLICT(location_id) DO UPDATE SET name=EXCLUDED.name,coverage_from=EXCLUDED.coverage_from`;
  const groups = await q`SELECT * FROM financial_groups`,
    departmentGroup = (id) => groups.find((g) => g.department_id === id).id,
    locationGroup = (id) => groups.find((g) => g.location_id === id).id;
  const memberships = [];
  for (const person of people) {
    const info = personInfo.get(person.id),
      from = Math.max(start, info.hired);
    const oldDepartment =
      departments.find((d) => d.id !== info.departmentId) ?? departments[0];
    if (info.move) {
      memberships.push(
        {
          user_id: person.id,
          group_id: departmentGroup(oldDepartment.id),
          valid_from: iso(from),
          valid_to: iso(info.move),
          reason: 'Internal team transfer',
        },
        {
          user_id: person.id,
          group_id: locationGroup(
            hq.id === info.workplace.id ? branch.id : hq.id
          ),
          valid_from: iso(from),
          valid_to: iso(info.move),
          reason: 'Workplace relocation',
        }
      );
    }
    memberships.push(
      {
        user_id: person.id,
        group_id: departmentGroup(info.departmentId),
        valid_from: iso(info.move ?? from),
        valid_to: null,
        reason: info.move ? 'Internal team transfer' : 'Joined the team',
      },
      {
        user_id: person.id,
        group_id: locationGroup(info.workplace.id),
        valid_from: iso(info.move ?? from),
        valid_to: null,
        reason: info.move ? 'Workplace relocation' : 'Assigned workplace',
      }
    );
  }
  await q`INSERT INTO financial_memberships ${q(memberships, 'user_id', 'group_id', 'valid_from', 'valid_to', 'reason')}`;
  const peopleUpdates = people.map((p) => ({
    id: p.id,
    department_id: personInfo.get(p.id).departmentId,
    created_at: iso(personInfo.get(p.id).hired),
  }));
  await q`UPDATE users u SET department_id=d.department_id,created_at=d.created_at FROM jsonb_to_recordset(${q.json(peopleUpdates)}) AS d(id uuid,department_id int,created_at timestamptz) WHERE u.id=d.id`;
  let equipment =
    await q`SELECT a.*,m.name AS model_name,c.name AS category,c.pillar FROM assets a JOIN models m ON m.id=a.model_id JOIN categories c ON c.id=m.category_id ORDER BY a.asset_tag,a.id`;
  const computers = equipment.filter(
    (a) =>
      /Laptop|Desktop/i.test(a.category) &&
      ['Assigned', 'Available'].includes(a.status)
  );
  const laptop = equipment.find((a) => /Laptop/i.test(a.category));
  if (laptop && computers.length < people.length + 3) {
    const nextSequence = Math.max(
      0,
      ...equipment.map((a) => Number(/^LAP-(\d+)$/.exec(a.asset_tag)?.[1] ?? 0))
    );
    const extra = Array.from(
      { length: people.length + 3 - computers.length },
      (_, i) => ({
        id: randomUUID(),
        asset_tag: `LAP-${String(nextSequence + i + 1).padStart(3, '0')}`,
        name: laptop.model_name,
        model_id: laptop.model_id,
        serial_number: randomUUID()
          .replaceAll('-', '')
          .slice(0, 12)
          .toUpperCase(),
        location_id: warehouse.id,
        status: 'Available',
        condition: 'Excellent',
      })
    );
    await q`INSERT INTO assets ${q(extra, 'id', 'asset_tag', 'name', 'model_id', 'serial_number', 'location_id', 'status', 'condition')} ON CONFLICT(asset_tag) DO NOTHING`;
  }
  const seating = [];
  for (const category of ['Chair', 'Desk']) {
    const existing = equipment.filter((a) => a.category === category),
      model = existing[0];
    if (!model) continue;
    const prefix = model.asset_tag.split('-')[0],
      sequence = Math.max(
        0,
        ...equipment
          .filter((a) => a.asset_tag.startsWith(`${prefix}-`))
          .map((a) => Number(a.asset_tag.split('-').at(-1)) || 0)
      );
    const missing = Math.max(
      0,
      people.length - existing.filter((a) => a.status === 'Assigned').length
    );
    for (let i = 0; i < missing; i++)
      seating.push({
        id: randomUUID(),
        asset_tag: `${prefix}-${String(sequence + i + 1).padStart(3, '0')}`,
        name: model.model_name,
        model_id: model.model_id,
        serial_number: null,
        location_id: hq.id,
        status: 'Assigned',
        condition: 'Excellent',
      });
  }
  if (seating.length)
    await q`INSERT INTO assets ${q(seating, 'id', 'asset_tag', 'name', 'model_id', 'serial_number', 'location_id', 'status', 'condition')} ON CONFLICT(asset_tag) DO NOTHING`;
  equipment =
    await q`SELECT a.*,m.name AS model_name,c.name AS category,c.pillar FROM assets a JOIN models m ON m.id=a.model_id JOIN categories c ON c.id=m.category_id ORDER BY a.asset_tag,a.id`;
  const primary = equipment
      .filter(
        (a) =>
          /Laptop|Desktop/i.test(a.category) &&
          ['Assigned', 'Available'].includes(a.status)
      )
      .slice(0, people.length),
    primaryIds = new Map(primary.map((a, i) => [a.id, people[i]]));
  const purchases = await q`SELECT * FROM asset_purchases`,
    purchaseMap = new Map(purchases.map((p) => [p.asset_id, p]));
  const disposals = await q`SELECT * FROM asset_disposals`,
    repairs = await q`SELECT * FROM maintenance_tickets ORDER BY id`;
  const assetUpdates = [],
    purchaseUpdates = [],
    newPurchases = [],
    policies = [],
    assetInfo = new Map();
  const usedWorkplaces = [
    ...new Map(
      people.map((p) => [
        personInfo.get(p.id).workplace.id,
        personInfo.get(p.id).workplace,
      ])
    ).values(),
  ];
  const seatCounters = { Chair: 0, Desk: 0 };
  for (const [index, asset] of equipment.entries()) {
    if (asset.pillar === 'Software') continue;
    const person = primaryIds.get(asset.id) ?? people[index % people.length],
      info = personInfo.get(person.id);
    let status = asset.status;
    if (primaryIds.has(asset.id)) status = 'Assigned';
    else if (
      /Laptop|Desktop/i.test(asset.category) &&
      ['Assigned', 'Available'].includes(status)
    )
      status = 'Available';
    const personal =
      asset.pillar === 'Hardware' &&
      /Laptop|Desktop|Monitor|Dock|Headphone|Tablet/i.test(asset.category);
    const seatingPerson =
      ['Chair', 'Desk'].includes(asset.category) && status === 'Assigned'
        ? people[seatCounters[asset.category]++ % people.length]
        : null;
    const workplace =
      status === 'In Repair'
        ? lab
        : status === 'Available'
          ? warehouse
          : seatingPerson
            ? personInfo.get(seatingPerson.id).workplace
            : personal
              ? info.workplace
              : usedWorkplaces[index % usedWorkplaces.length];
    const shared = !personal && status === 'Assigned';
    const cost =
      Math.round(
        (equipmentPrice(asset.category, asset.model_name) *
          (0.94 + (index % 9) * 0.0175)) /
          500
      ) * 500;
    let life =
      asset.pillar === 'Office Furniture'
        ? 84
        : asset.pillar === 'Office Electronics'
          ? 60
          : /server|Storage|Firewall|Switch/i.test(asset.category)
            ? 60
            : 48;
    let purchased = month(now, -((index % 42) + 4)) + ((index % 18) + 2) * DAY;
    if (index % 7 === 0 && status !== 'Disposed')
      purchased = month(now, -((index % 5) + 1)) + ((index % 15) + 2) * DAY;
    const earliest = /M3|G10|3440|2023/i.test(asset.model_name)
      ? midnight('2023-11-01')
      : /M2/i.test(asset.model_name)
        ? midnight('2022-07-01')
        : /2024|Gen 5/i.test(asset.model_name)
          ? midnight('2024-01-01')
          : midnight('2020-01-01');
    purchased = Math.max(purchased, earliest);
    // An older furniture item awaiting replacement demonstrates a known zero
    // depreciation period without inventing a missing price.
    if (status === 'Retired' && asset.pillar === 'Office Furniture') {
      life = 60;
      purchased = Math.max(earliest, month(now, -78));
    }
    let disposed = null;
    const disposal = disposals.find(
      (d) => d.asset_id === asset.id && d.status === 'Completed'
    );
    if (disposal || status === 'Disposed') {
      status = 'Disposed';
      asset.status = status;
      disposed = month(now, -((index % 8) + 1)) + ((index % 15) + 6) * DAY;
      purchased = Math.min(purchased, disposed - 180 * DAY);
    }
    purchased = Math.min(purchased, now - 35 * DAY);
    const residual = Math.round(
      cost * (asset.pillar === 'Office Furniture' ? 0.15 : 0.1)
    );
    assetUpdates.push({
      id: asset.id,
      status,
      location_id: workplace.id,
      useful_life_months: life,
      salvage_value: money(residual),
      created_at: iso(purchased + DAY),
      is_archived: status === 'Disposed',
    });
    const purchase = {
      asset_id: asset.id,
      purchase_date: date(purchased),
      base_price: money(cost),
      tax: '0.00',
      shipping_cost: '0.00',
      total_cost: money(cost),
      currency_code: 'LKR',
      exchange_rate: '1',
      estimated_salvage_value: money(Math.round(cost * 0.12)),
      warranty_expiry: date(purchased + 3 * 365 * DAY),
    };
    if (purchaseMap.has(asset.id))
      purchaseUpdates.push({ ...purchase, id: purchaseMap.get(asset.id).id });
    else newPurchases.push(purchase);
    const group = personal
      ? departmentGroup(info.departmentId)
      : locationGroup(workplace.id);
    policies.push({
      asset_id: asset.id,
      group_id: group,
      shared,
      valid_from: iso(purchased),
      valid_to: null,
    });
    assetInfo.set(asset.id, {
      ...asset,
      status,
      personal,
      person,
      workplace,
      purchased,
      disposed,
      cost,
      residual,
      life,
      index,
    });
  }
  for (const asset of assetInfo.values()) {
    if (
      !asset.disposed ||
      disposals.some((d) => d.asset_id === asset.id && d.status === 'Completed')
    )
      continue;
    const [disposal] =
      await q`INSERT INTO asset_disposals(asset_id,requested_by_id,approved_by_id,status,reason,disposal_method,data_wiped,tags_removed,requested_at,resolved_at) VALUES(${asset.id},${actor.id},${actor.id},'Completed','Beyond economic repair','Recycling',true,true,${iso(asset.disposed - 8 * DAY)}::timestamp,${iso(asset.disposed)}::timestamp) RETURNING *`;
    disposals.push(disposal);
  }
  await q`UPDATE assets a SET status=d.status,location_id=d.location_id,useful_life_months=d.useful_life_months,salvage_value=d.salvage_value,created_at=d.created_at,is_archived=d.is_archived,updated_at=${iso(now)}::timestamp FROM jsonb_to_recordset(${q.json(assetUpdates)}) AS d(id uuid,status varchar,location_id int,useful_life_months int,salvage_value numeric,created_at timestamp,is_archived boolean) WHERE a.id=d.id`;
  await q`UPDATE asset_purchases p SET purchase_date=d.purchase_date,base_price=d.base_price,tax=d.tax,shipping_cost=d.shipping_cost,total_cost=d.total_cost,currency_code=d.currency_code,exchange_rate=d.exchange_rate,estimated_salvage_value=d.estimated_salvage_value,warranty_expiry=d.warranty_expiry FROM jsonb_to_recordset(${q.json(purchaseUpdates)}) AS d(id int,purchase_date date,base_price numeric,tax numeric,shipping_cost numeric,total_cost numeric,currency_code varchar,exchange_rate numeric,estimated_salvage_value numeric,warranty_expiry date) WHERE p.id=d.id`;
  if (newPurchases.length)
    await q`INSERT INTO asset_purchases ${q(newPurchases, 'asset_id', 'purchase_date', 'base_price', 'tax', 'shipping_cost', 'total_cost', 'currency_code', 'exchange_rate', 'estimated_salvage_value', 'warranty_expiry')}`;
  if (policies.length)
    await q`INSERT INTO asset_cost_policies ${q(policies, 'asset_id', 'group_id', 'shared', 'valid_from', 'valid_to')}`;
  const repairUpdates = [],
    repairWindows = new Map();
  for (const [index, ticket] of repairs.entries()) {
    const asset = assetInfo.get(ticket.asset_id);
    if (!asset) continue;
    const status =
      ticket.status === 'ACTIVE' && asset.status !== 'In Repair'
        ? 'COMPLETED'
        : ticket.status;
    const completed = status === 'COMPLETED';
    let finish = month(start, index % 19) + ((index % 17) + 6) * DAY;
    finish = Math.min(
      now - 2 * DAY,
      Math.max(finish, asset.purchased + 28 * DAY)
    );
    if (asset.disposed) finish = Math.min(finish, asset.disposed - 7 * DAY);
    const created = completed
      ? finish - (3 + (index % 6)) * DAY
      : now - (5 + (index % 20)) * DAY;
    const cost =
      Math.round(
        Math.min(
          asset.cost * 0.22,
          Math.max(4500, asset.cost * (0.035 + (index % 5) * 0.012))
        ) / 500
      ) * 500;
    repairUpdates.push({
      id: ticket.id,
      reported_issue: maintenanceWork(asset.category)[0],
      status,
      created_at: iso(created),
      actual_completion_date: completed ? iso(finish) : null,
      actual_cost: completed ? money(cost) : null,
      estimated_cost: money(Math.round((cost * 1.12) / 500) * 500),
      currency_code: 'LKR',
      exchange_rate: '1',
      estimated_return_date: date(
        completed ? finish : now + (4 + (index % 8)) * DAY
      ),
      resolution_notes: completed
        ? maintenanceWork(asset.category)[1]
        : ticket.resolution_notes,
    });
    const windows = repairWindows.get(asset.id) ?? [];
    if (completed || (status === 'ACTIVE' && asset.status === 'In Repair'))
      windows.push({
        from: created,
        to: completed ? finish + DAY : now + 365 * DAY,
      });
    repairWindows.set(asset.id, windows);
  }
  if (repairUpdates.length)
    await q`UPDATE maintenance_tickets t SET reported_issue=d.reported_issue,status=d.status::maintenance_ticket_status,created_at=d.created_at,actual_completion_date=d.actual_completion_date,actual_cost=d.actual_cost,estimated_cost=d.estimated_cost,currency_code=d.currency_code,exchange_rate=d.exchange_rate,estimated_return_date=d.estimated_return_date,resolution_notes=d.resolution_notes,updated_at=COALESCE(d.actual_completion_date,d.created_at) FROM jsonb_to_recordset(${q.json(repairUpdates)}) AS d(id int,reported_issue text,status varchar,created_at timestamp,actual_completion_date timestamp,actual_cost numeric,estimated_cost numeric,currency_code varchar,exchange_rate numeric,estimated_return_date date,resolution_notes text) WHERE t.id=d.id`;
  const cancellationNote =
    'Request cancelled after inspection confirmed no component replacement was needed.';
  for (const category of ['Laptop', 'Chair', 'Printer']) {
    const asset = [...assetInfo.values()].find(
      (a) =>
        a.category === category && ['Available', 'Assigned'].includes(a.status)
    );
    if (!asset) continue;
    await q`INSERT INTO maintenance_tickets(asset_id,ticket_type,reported_issue,estimated_cost,currency_code,exchange_rate,status,dispatched_by_id,resolution_notes,created_at,updated_at) SELECT ${asset.id},'INTERNAL',${maintenanceWork(asset.category)[0]},${money(Math.min(asset.cost * 0.04, 18000))},'LKR',1,'CANCELLED',${actor.id},${cancellationNote},${iso(now - 12 * DAY)}::timestamp,${iso(now - 10 * DAY)}::timestamp WHERE NOT EXISTS (SELECT 1 FROM maintenance_tickets WHERE asset_id=${asset.id} AND resolution_notes=${cancellationNote})`;
  }
  // Keep issue/repair workflows coherent after spreading maintenance through history.
  for (const asset of assetInfo.values())
    if (
      asset.status === 'In Repair' &&
      !(repairWindows.get(asset.id) ?? []).some((w) => w.to > now)
    ) {
      const created = now - (7 + (asset.index % 14)) * DAY;
      await q`INSERT INTO maintenance_tickets(asset_id,ticket_type,reported_issue,estimated_cost,currency_code,exchange_rate,estimated_return_date,status,dispatched_by_id,created_at) VALUES(${asset.id},'VENDOR',${maintenanceWork(asset.category)[0]},${money(Math.min(asset.cost * 0.08, 65000))},'LKR',1,${date(now + 7 * DAY)},'ACTIVE',${actor.id},${iso(created)}::timestamp)`;
      const windows = repairWindows.get(asset.id) ?? [];
      windows.push({ from: created, to: now + 365 * DAY });
      repairWindows.set(asset.id, windows);
    }
  const assignments = [];
  const addCustody = (asset, user, from, to, notes) => {
    from = Math.max(
      from,
      asset.purchased + 2 * DAY,
      personInfo.get(user.id).hired + DAY
    );
    if (to != null && to - from < DAY) return;
    let pieces = [{ from, to: to ?? now + 3650 * DAY }];
    for (const window of repairWindows.get(asset.id) ?? [])
      pieces = pieces.flatMap((p) =>
        window.to <= p.from || window.from >= p.to
          ? [p]
          : [
              ...(window.from > p.from
                ? [{ from: p.from, to: window.from }]
                : []),
              ...(window.to < p.to ? [{ from: window.to, to: p.to }] : []),
            ]
      );
    for (const piece of pieces) {
      if (piece.from >= now || piece.to - piece.from < DAY) continue;
      const returned = piece.to > now ? null : piece.to;
      assignments.push({
        asset_id: asset.id,
        assigned_to_user_id: user.id,
        assigned_to_location_id: null,
        assigned_by_id: actor.id,
        assigned_date: iso(piece.from + 8 * 3600000),
        accepted_at: iso(piece.from + 10 * 3600000),
        returned_date: returned ? iso(returned) : null,
        expected_return_date: date((returned ?? now) + 180 * DAY),
        return_condition: returned ? 'Excellent' : null,
        notes,
        acceptance_status: returned ? 'transferred' : 'accepted',
        state: returned ? 'returned' : 'assigned',
      });
    }
  };
  for (const asset of assetInfo.values()) {
    if (asset.personal) {
      const from = Math.max(start, asset.purchased + 4 * DAY);
      let end = asset.disposed;
      if (
        [
          'Available',
          'Returned',
          'Defective',
          'Lost',
          'Retired',
          'Pending Disposal',
        ].includes(asset.status)
      )
        end = now - ((asset.index % 35) + 4) * DAY;
      if (asset.status === 'In Repair')
        end = Math.min(
          ...(repairWindows.get(asset.id) ?? [])
            .filter((w) => w.to > now)
            .map((w) => w.from)
        );
      const currentStart = Math.max(
        from,
        personInfo.get(asset.person.id).hired + 2 * DAY,
        month(now, -((asset.index % 4) + 1)) + 5 * DAY
      );
      const previousPeople = people.filter(
        (p) =>
          p.id !== asset.person.id &&
          personInfo.get(p.id).hired < currentStart - 45 * DAY
      );
      const previous =
        previousPeople[asset.index % Math.max(1, previousPeople.length)] ??
        asset.person;
      if (currentStart - from > 45 * DAY)
        addCustody(
          asset,
          previous,
          from,
          currentStart,
          'Issued for project delivery; returned during the workstation refresh.'
        );
      addCustody(
        asset,
        asset.person,
        currentStart,
        end,
        'Assigned with standard productivity and security software.'
      );
    } else if (['Assigned', 'Returned'].includes(asset.status))
      assignments.push({
        asset_id: asset.id,
        assigned_to_user_id: null,
        assigned_to_location_id: asset.workplace.id,
        assigned_by_id: actor.id,
        assigned_date: iso(Math.max(start, asset.purchased + 2 * DAY)),
        accepted_at: null,
        returned_date: asset.status === 'Returned' ? iso(now - 4 * DAY) : null,
        expected_return_date: null,
        return_condition: asset.status === 'Returned' ? 'Excellent' : null,
        notes:
          asset.status === 'Returned'
            ? 'Returned after workplace reconfiguration.'
            : 'Installed for shared workplace use.',
        acceptance_status: null,
        state: asset.status === 'Returned' ? 'returned' : 'assigned',
      });
  }
  await q`DELETE FROM asset_assignments`;
  if (assignments.length)
    await q`INSERT INTO asset_assignments ${q(assignments, 'asset_id', 'assigned_to_user_id', 'assigned_to_location_id', 'assigned_by_id', 'assigned_date', 'accepted_at', 'returned_date', 'expected_return_date', 'return_condition', 'notes', 'acceptance_status', 'state')}`;
  const disposalUpdates = [];
  for (const disposal of disposals) {
    const asset = assetInfo.get(disposal.asset_id);
    if (!asset) continue;
    const resolved = disposal.status === 'Completed' ? asset.disposed : null;
    const requested = resolved
      ? resolved - 8 * DAY
      : now - ((asset.index % 10) + 3) * DAY;
    const elapsed = resolved
      ? Math.max(
          0,
          (new Date(resolved + OFFSET).getUTCFullYear() -
            new Date(asset.purchased + OFFSET).getUTCFullYear()) *
            12 +
            new Date(resolved + OFFSET).getUTCMonth() -
            new Date(asset.purchased + OFFSET).getUTCMonth()
        )
      : 0;
    disposalUpdates.push({
      id: disposal.id,
      requested_at: iso(requested),
      resolved_at: resolved
        ? iso(resolved)
        : disposal.status === 'Rejected'
          ? iso(now - DAY)
          : null,
      book_value_at_disposal: resolved
        ? money(
            Math.max(
              asset.residual,
              asset.cost -
                ((asset.cost - asset.residual) / asset.life) *
                  Math.min(asset.life, elapsed)
            )
          )
        : null,
      actual_salvage_value: resolved
        ? money(
            Math.round(
              (asset.cost * (0.025 + (asset.index % 4) * 0.015)) / 500
            ) * 500
          )
        : null,
    });
  }
  if (disposalUpdates.length)
    await q`UPDATE asset_disposals d SET requested_at=s.requested_at,resolved_at=s.resolved_at,book_value_at_disposal=s.book_value_at_disposal,actual_salvage_value=s.actual_salvage_value FROM jsonb_to_recordset(${q.json(disposalUpdates)}) AS s(id int,requested_at timestamp,resolved_at timestamp,book_value_at_disposal numeric,actual_salvage_value numeric) WHERE d.id=s.id`;

  const licenses =
    await q`SELECT s.*,m.name AS product FROM software_licenses s JOIN models m ON m.id=s.model_id ORDER BY m.name`;
  await q`DELETE FROM software_allocations`;
  const terms = [],
    allocations = [],
    licenseUpdates = [];
  const currentPurchases = await q`SELECT id,asset_id FROM asset_purchases`,
    purchaseIds = new Map(currentPurchases.map((p) => [p.asset_id, p.id]));
  for (const license of licenses) {
    const plan = softwarePlan(license.product, people),
      type = plan.perpetual ? 'Perpetual' : 'Subscription';
    const candidates = [...people].sort(
      (a, b) =>
        Number(plan.department !== a.department) -
          Number(plan.department !== b.department) ||
        a.name.localeCompare(b.name)
    );
    const formerUsers = new Set();
    const selected = candidates.slice(
      0,
      Math.min(plan.assigned, plan.seats, people.length)
    );
    let beginnings = [];
    if (plan.perpetual) beginnings = [month(start, -3)];
    else if (plan.annual) {
      let anchor =
        Date.UTC(new Date(start + OFFSET).getUTCFullYear(), plan.renewal, 15) -
        OFFSET;
      if (anchor > start)
        anchor =
          Date.UTC(
            new Date(start + OFFSET).getUTCFullYear() - 1,
            plan.renewal,
            15
          ) - OFFSET;
      for (
        let at = anchor;
        at <= now;
        at =
          Date.UTC(
            new Date(at + OFFSET).getUTCFullYear() + 1,
            plan.renewal,
            15
          ) - OFFSET
      )
        beginnings.push(at);
    } else
      for (let at = start; at <= now; at = month(at, 1)) beginnings.push(at);
    const licenseTerms = [];
    for (const [index, from] of beginnings.entries()) {
      const to = plan.perpetual
        ? month(from, plan.life)
        : plan.annual
          ? Date.UTC(
              new Date(from + OFFSET).getUTCFullYear() + 1,
              plan.renewal,
              15
            ) - OFFSET
          : month(from, 1);
      const progress = Math.max(
        0,
        Math.min(1, (from - start) / (month(now) - start || 1))
      );
      const seats = plan.perpetual
        ? plan.seats
        : Math.max(
            1,
            Math.min(plan.seats, Math.ceil(plan.seats * (0.7 + progress * 0.3)))
          );
      const multiplier = plan.perpetual ? 1 : plan.annual ? 12 : 1,
        amount = money(
          plan.price *
            seats *
            multiplier *
            (from >= midnight('2026-07-01') ? 1.04 : 1)
        ),
        rate =
          new Date(from + OFFSET).getUTCFullYear() <= 2025 ? '299.5' : '305';
      const term = {
        license_id: license.id,
        source_purchase_id:
          index === 0 ? (purchaseIds.get(license.asset_id) ?? null) : null,
        amount,
        currency_code: 'USD',
        exchange_rate: rate,
        valid_from: iso(from),
        valid_to: iso(to),
        seats,
        allocation_life_months: plan.perpetual ? plan.life : null,
      };
      terms.push(term);
      licenseTerms.push({ from, to, seats, amount, rate });
    }
    const latest = licenseTerms.at(-1),
      first = licenseTerms[0];
    licenseUpdates.push({
      id: license.id,
      license_type: type,
      total_seats: latest.seats,
      start_date: date(first.from),
      expiry_date: plan.perpetual ? null : date(latest.to - DAY),
      is_active: true,
    });
    if (license.asset_id) {
      await q`UPDATE asset_purchases SET purchase_date=${date(first.from)},base_price=${first.amount},tax=0,shipping_cost=0,total_cost=${first.amount},currency_code='USD',exchange_rate=${first.rate},estimated_salvage_value=0 WHERE asset_id=${license.asset_id}`;
      await q`UPDATE assets SET salvage_value=0,useful_life_months=${plan.perpetual ? plan.life : null},created_at=${iso(first.from)}::timestamp,location_id=${it.id},status='Available',is_archived=false WHERE id=${license.asset_id}`;
    }
    selected.forEach((person, index) => {
      const available = licenseTerms.find((t) => t.seats > index);
      if (!available) return;
      const hire = personInfo.get(person.id).hired;
      let from = Math.max(start, first.from, available.from, hire + 2 * DAY);
      const prior = candidates.find(
        (p) =>
          !selected.some((s) => s.id === p.id) &&
          !formerUsers.has(p.id) &&
          personInfo.get(p.id).hired < from &&
          p.id !== person.id
      );
      if (prior && index % 7 === 0 && from < month(now, -4)) {
        const change = month(now, -4) + 3 * DAY;
        formerUsers.add(prior.id);
        allocations.push({
          license_id: license.id,
          assigned_to_user_id: prior.id,
          allocated_at: iso(from),
          revoked_at: iso(change),
        });
        from = change + 2 * 3600000;
      }
      if (from < now)
        allocations.push({
          license_id: license.id,
          assigned_to_user_id: person.id,
          allocated_at: iso(from),
          revoked_at: null,
        });
    });
  }
  if (terms.length)
    await q`INSERT INTO software_financial_terms ${q(terms, 'license_id', 'source_purchase_id', 'amount', 'currency_code', 'exchange_rate', 'valid_from', 'valid_to', 'seats', 'allocation_life_months')}`;
  if (allocations.length)
    await q`INSERT INTO software_allocations ${q(allocations, 'license_id', 'assigned_to_user_id', 'allocated_at', 'revoked_at')}`;
  if (licenseUpdates.length)
    await q`UPDATE software_licenses l SET license_type=d.license_type::license_type,total_seats=d.total_seats,start_date=d.start_date,expiry_date=d.expiry_date,is_active=d.is_active,updated_at=${iso(now)}::timestamp FROM jsonb_to_recordset(${q.json(licenseUpdates)}) AS d(id uuid,license_type varchar,total_seats int,start_date date,expiry_date date,is_active boolean) WHERE l.id=d.id`;
  // An audit entry documents the exhibition dataset refresh without obscuring login history.
  await q`INSERT INTO system_audit_logs(entity_type,entity_id,action_type,performed_by_id,new_value,performed_at) VALUES('FinancialDataset','cost-history','UPDATE',${actor.id},${q.json({ people: people.length, historyFrom: date(start), asOf, softwareTerms: terms.length })},${iso(now)}::timestamp)`;
  const [validation] = await q`SELECT
    (SELECT count(*)::int FROM (SELECT asset_id FROM asset_assignments WHERE returned_date IS NULL GROUP BY asset_id HAVING count(*)>1) a) AS open_assignment_overlaps,
    (SELECT count(*)::int FROM software_allocations a JOIN software_allocations b ON a.license_id=b.license_id AND a.assigned_to_user_id=b.assigned_to_user_id AND a.id<b.id AND a.allocated_at<COALESCE(b.revoked_at,'infinity'::timestamp) AND b.allocated_at<COALESCE(a.revoked_at,'infinity'::timestamp)) AS duplicate_software_users,
    (SELECT count(*)::int FROM software_financial_terms a JOIN software_financial_terms b ON a.license_id=b.license_id AND a.id<b.id AND a.valid_from<b.valid_to AND b.valid_from<a.valid_to) AS overlapping_software_terms,
    (SELECT count(*)::int FROM asset_assignments WHERE accepted_at IS NOT NULL AND returned_date IS NOT NULL AND returned_date<=accepted_at) AS invalid_custody_dates,
    (SELECT count(*)::int FROM asset_purchases WHERE total_cost IS NULL OR purchase_date IS NULL OR exchange_rate IS NULL OR exchange_rate<=0) AS missing_purchase_inputs,
    (SELECT count(*)::int FROM assets a WHERE a.status='Assigned' AND NOT EXISTS (SELECT 1 FROM asset_assignments x WHERE x.asset_id=a.id AND x.returned_date IS NULL)) AS assigned_assets_without_custody,
    (SELECT count(*)::int FROM assets a JOIN asset_assignments x ON x.asset_id=a.id WHERE a.status<>'Assigned' AND x.returned_date IS NULL) AS released_assets_with_open_custody,
    (SELECT count(*)::int FROM software_allocations a JOIN software_financial_terms t ON t.license_id=a.license_id AND a.allocated_at>=t.valid_from AND a.allocated_at<t.valid_to WHERE (SELECT count(*) FROM software_allocations live WHERE live.license_id=a.license_id AND live.allocated_at<=a.allocated_at AND (live.revoked_at IS NULL OR live.revoked_at>a.allocated_at))>t.seats) AS oversubscribed_seat_intervals`;
  if (Object.values(validation).some((n) => Number(n) > 0))
    throw new Error(
      `Exhibition history failed validation: ${JSON.stringify(validation)}`
    );
  const [cases] = await q`SELECT
    (SELECT COALESCE(SUM(l.total_seats-(SELECT count(*) FROM software_allocations a WHERE a.license_id=l.id AND a.revoked_at IS NULL)),0)::int FROM software_licenses l) AS unused_software_seats,
    (SELECT count(*)::int FROM maintenance_tickets WHERE status='COMPLETED') AS completed_maintenance,
    (SELECT count(*)::int FROM maintenance_tickets WHERE status='ACTIVE') AS active_maintenance,
    (SELECT count(*)::int FROM maintenance_tickets WHERE status='CANCELLED') AS cancelled_maintenance,
    (SELECT count(*)::int FROM assets a JOIN asset_purchases p ON p.asset_id=a.id JOIN models m ON m.id=a.model_id JOIN categories c ON c.id=m.category_id WHERE c.pillar<>'Software' AND (EXTRACT(YEAR FROM AGE(${asOf}::date,p.purchase_date))*12 + EXTRACT(MONTH FROM AGE(${asOf}::date,p.purchase_date))) >= a.useful_life_months) AS fully_depreciated_assets,
    (SELECT count(*)::int FROM assets WHERE status='Available') AS spare_assets,
    (SELECT count(*)::int FROM assets WHERE status='Returned') AS returned_assets,
    (SELECT count(*)::int FROM asset_disposals WHERE status='Completed') AS completed_disposals,
    (SELECT count(*)::int FROM asset_assignments WHERE returned_date IS NOT NULL) AS historical_returns_and_transfers,
    (SELECT count(*)::int FROM software_financial_terms) AS paid_software_periods`;
  return {
    people: people.length,
    equipment: assetInfo.size,
    primaryComputers: primary.length,
    historyFrom: date(start),
    through: asOf,
    memberships: memberships.length,
    costPolicies: policies.length,
    assignments: assignments.length,
    softwareTerms: terms.length,
    softwareAllocations: allocations.length,
    repairs: repairUpdates.length,
    cases,
    validation,
  };
}

async function main() {
  dotenv.config({ quiet: true });
  const apply = process.argv.includes('--apply'),
    asOf =
      process.argv.find((arg) => arg.startsWith('--as-of='))?.slice(8) ??
      date(Date.now());
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const sql = postgres(process.env.DATABASE_URL, {
    max: 1,
    ssl:
      new URL(process.env.DATABASE_URL).hostname === '127.0.0.1'
        ? false
        : 'require',
    connect_timeout: 15,
    onnotice: () => {},
  });
  try {
    if (apply) {
      const snapshot = { createdAt: new Date().toISOString(), tables: {} };
      for (const table of BACKUP_TABLES) {
        if (!/^[a-z_]+$/.test(table))
          throw new Error('Invalid snapshot table.');
        snapshot.tables[table] = await sql.unsafe(
          `SELECT * FROM public.${table}`
        );
      }
      await mkdir('db-backups', { recursive: true });
      const path = join(
        'db-backups',
        `financial-exhibition-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
      );
      await writeFile(path, JSON.stringify(snapshot, null, 2));
      console.log(`Saved pre-update snapshot: ${path}`);
    }
    let report;
    const rollback = new Error('Exhibition dry run');
    try {
      await sql.begin(async (tx) => {
        report = await seedFinancialDemo(tx, { asOf });
        if (!apply) throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
    console.log(JSON.stringify({ applied: apply, ...report }, null, 2));
  } finally {
    await sql.end();
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
