import type {
  CostAsset,
  CostComponent,
  CostInterval,
  PerHeadDataset,
  PerHeadReport,
  PersonCostDetail,
  PersonCostRow,
  PersonAssetValue,
} from '@/types/per-head-costs';
import {
  addMonths,
  DAY_MS,
  localDate,
  monthDifference,
  monthKey,
  monthStart,
  REPORTING_TIMEZONE,
  reportDate,
} from '@/lib/reporting-time';

const instant = (value: string | null | undefined) =>
  value ? Date.parse(value) : Infinity;
const active = (value: CostInterval, at: number) =>
  instant(value.from) <= at && at < instant(value.to);
const roundedRatio = (value: bigint, numerator: number, denominator: number) =>
  (value * BigInt(numerator) + BigInt(Math.floor(denominator / 2))) /
  BigInt(denominator);
const money = (value: bigint) => {
  if (
    value > BigInt(Number.MAX_SAFE_INTEGER) ||
    value < BigInt(-Number.MAX_SAFE_INTEGER)
  )
    throw new Error('Cost total exceeds the supported reporting precision.');
  return Number(value) / 100;
};
function indexBy<T, K>(values: T[], key: (value: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const value of values) {
    const k = key(value);
    const bucket = map.get(k);
    if (bucket) bucket.push(value);
    else map.set(k, [value]);
  }
  return map;
}
const decimal = (value: string) => {
  if (!/^\d+(\.\d{1,6})?$/.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * BigInt(1_000_000) + BigInt(fraction.padEnd(6, '0'));
};
/** Exact recorded FX -> LKR cents, with no floating-point currency aggregation. */
export function reportingCents(
  amount: string | null,
  currency: string | null,
  rate: string | null
): bigint | null {
  if (amount == null || !currency) return null;
  const value = decimal(amount);
  const fx =
    currency === 'LKR' ? BigInt(1_000_000) : rate ? decimal(rate) : null;
  if (
    value == null ||
    fx == null ||
    fx <= BigInt(0) ||
    (currency !== 'LKR' && fx === BigInt(1_000_000))
  )
    return null;
  return (value * fx + BigInt(5_000_000_000)) / BigInt(10_000_000_000);
}

/** All cost sources are split before person filters; one cent is never allocated twice. */
export function calculatePerHeadCosts(
  data: PerHeadDataset,
  options: {
    from: string;
    to: string;
    asOf: string;
    groupId?: number;
    detailPersonId?: string | null;
  }
): PerHeadReport {
  const start = reportDate(options.from),
    requestedEnd = reportDate(options.to) + DAY_MS;
  const now = instant(options.asOf),
    end = Math.min(requestedEnd, now);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
    throw new Error(
      'Choose a reporting period that starts before the current time.'
    );
  const exceptions = new Map<
    string,
    { source: string; assetId: string | null; message: string }
  >();
  const warn = (source: string, assetId: string | null, message: string) =>
    exceptions.set(`${source}:${message}`, { source, assetId, message });
  const people = new Map(data.people.map((p) => [p.id, p]));
  const assets = new Map(data.assets.map((a) => [a.id, a]));
  const groups = new Map(data.groups.map((g) => [g.id, g]));
  const policiesByAsset = indexBy(data.policies, (p) => p.assetId);
  const assignmentsByAsset = indexBy(data.assignments, (a) => a.assetId);
  const membershipsByGroup = indexBy(data.memberships, (m) => m.groupId);
  const allocationsByLicense = indexBy(
    data.softwareAllocations,
    (a) => a.licenseId
  );
  const termsByLicense = indexBy(data.terms, (t) => t.licenseId);
  const participating = new Set<string>();
  const details: Record<string, PersonCostDetail[]> = {};
  const currentAssets: Record<string, PersonAssetValue[]> = {};
  const costs = new Map<string, Record<CostComponent, bigint>>();
  const values = new Map<
    string,
    {
      acquisition: bigint;
      book: bigint;
      assets: Set<string>;
      seats: Set<string>;
    }
  >();
  const trends = new Map<string, { allocated: bigint; overhead: bigint }>();
  let sourceTotal = BigInt(0),
    allocatedTotal = BigInt(0),
    unallocated = BigInt(0),
    unused = BigInt(0);
  const enroll = (userId: string) => {
    if (!people.has(userId)) return false;
    participating.add(userId);
    if (!costs.has(userId))
      costs.set(userId, {
        directDepreciation: BigInt(0),
        sharedDepreciation: BigInt(0),
        software: BigInt(0),
        repairs: BigInt(0),
      });
    if (!values.has(userId))
      values.set(userId, {
        acquisition: BigInt(0),
        book: BigInt(0),
        assets: new Set(),
        seats: new Set(),
      });
    return true;
  };
  const policyAt = (assetId: string, at: number) => {
    const matches = (policiesByAsset.get(assetId) ?? []).filter((p) =>
      active(p, at)
    );
    if (matches.length > 1) {
      warn(
        `asset:${assetId}`,
        assetId,
        'Overlapping cost policies; shared cost remains unallocated.'
      );
      return undefined;
    }
    return matches[0];
  };
  const membersAt = (groupId: number, at: number) => {
    const group = groups.get(groupId);
    if (!group || at < instant(group.coverageFrom)) return [];
    return [
      ...new Set(
        (membershipsByGroup.get(groupId) ?? [])
          .filter((m) => active(m, at))
          .map((m) => m.userId)
      ),
    ]
      .filter((id) => people.has(id))
      .sort();
  };
  const custodyAt = (assetId: string, at: number) =>
    (assignmentsByAsset.get(assetId) ?? []).filter(
      (a) =>
        a.userId &&
        a.acceptedAt &&
        instant(a.acceptedAt) <= at &&
        at < instant(a.to) &&
        !['cancelled', 'rejected'].includes(a.acceptanceStatus ?? '')
    );
  const seatsAt = (licenseId: string, at: number) =>
    (allocationsByLicense.get(licenseId) ?? []).filter(
      (a) => active(a, at) && at < instant(a.expiresAt)
    );
  const share = (
    amount: bigint,
    ids: string[],
    denominator = ids.length
  ): [string, bigint][] => {
    if (denominator <= 0) return [];
    const base = amount / BigInt(denominator),
      extra = amount % BigInt(denominator);
    return ids.map((id, index) => [
      id,
      base + (BigInt(index) < extra ? BigInt(1) : BigInt(0)),
    ]);
  };
  const post = (
    asset: CostAsset,
    component: CostComponent,
    source: string,
    at: number,
    amount: bigint,
    recipients: [string, bigint][],
    groupId: number | null,
    unusedSeats = false
  ) => {
    const month = monthKey(at);
    const trend = trends.get(month) ?? {
      allocated: BigInt(0),
      overhead: BigInt(0),
    };
    sourceTotal += amount;
    let assigned = BigInt(0);
    for (const [id, value] of recipients) {
      if (!enroll(id)) continue;
      costs.get(id)![component] += value;
      assigned += value;
      if (
        options.detailPersonId !== null &&
        (!options.detailPersonId || options.detailPersonId === id)
      )
        (details[id] ??= []).push({
          assetId: asset.id,
          assetTag: asset.tag,
          component,
          amount: money(value),
          groupId,
          source,
          month,
        });
    }
    const remainder = amount - assigned;
    allocatedTotal += assigned;
    if (unusedSeats) unused += remainder;
    else unallocated += remainder;
    trend.allocated += assigned;
    trend.overhead += remainder;
    trends.set(month, trend);
  };
  const boundaries = (
    assetId: string,
    from: number,
    to: number,
    licenseId?: string
  ) => {
    const points = new Set([from, to]);
    const add = (at: number) => {
      if (Number.isFinite(at) && at > from && at < to) points.add(at);
    };
    const policies = policiesByAsset.get(assetId) ?? [];
    const groupIds = new Set(policies.map((p) => p.groupId));
    for (const p of policies) {
      add(instant(p.from));
      add(instant(p.to));
    }
    for (const a of assignmentsByAsset.get(assetId) ?? []) {
      add(instant(a.acceptedAt));
      add(instant(a.to));
    }
    for (const m of data.memberships.filter((m) => groupIds.has(m.groupId))) {
      add(instant(m.from));
      add(instant(m.to));
    }
    for (const g of data.groups.filter((g) => groupIds.has(g.id)))
      add(instant(g.coverageFrom));
    if (licenseId)
      for (const a of allocationsByLicense.get(licenseId) ?? []) {
        add(instant(a.from));
        add(instant(a.to));
        add(instant(a.expiresAt));
      }
    for (
      let month = addMonths(monthStart(from), 1);
      month < to;
      month = addMonths(month, 1)
    )
      add(month);
    return [...points].sort((a, b) => a - b);
  };
  const allocateInterval = (
    asset: CostAsset,
    source: string,
    amount: bigint,
    sourceFrom: number,
    sourceTo: number,
    eligibleFrom: number,
    eligibleTo: number,
    license?: { id: string; seats: number }
  ) => {
    const from = Math.max(start, sourceFrom, eligibleFrom),
      to = Math.min(end, sourceTo, eligibleTo);
    if (to <= from) return;
    const points = boundaries(asset.id, from, to, license?.id);
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1],
        b = points[i];
      const policy = policyAt(asset.id, a);
      if (options.groupId && policy?.groupId !== options.groupId) continue;
      const part =
        roundedRatio(amount, b - sourceFrom, sourceTo - sourceFrom) -
        roundedRatio(amount, a - sourceFrom, sourceTo - sourceFrom);
      if (license) {
        const seats = seatsAt(license.id, a);
        const ids = [...new Set(seats.map((s) => s.userId))]
          .filter((id) => people.has(id))
          .sort();
        if (seats.length > license.seats || seats.length !== ids.length) {
          warn(
            source,
            asset.id,
            'Overlapping or excessive software allocations; expense remains unallocated.'
          );
          post(asset, 'software', source, a, part, [], policy?.groupId ?? null);
          continue;
        }
        post(
          asset,
          'software',
          source,
          a,
          part,
          share(part, ids, license.seats),
          policy?.groupId ?? null,
          true
        );
      } else {
        const custody = custodyAt(asset.id, a);
        if (custody.length > 1) {
          warn(
            source,
            asset.id,
            'Overlapping accepted custody; expense remains unallocated.'
          );
          post(
            asset,
            'directDepreciation',
            source,
            a,
            part,
            [],
            policy?.groupId ?? null
          );
          continue;
        }
        if (custody.length === 1)
          post(
            asset,
            'directDepreciation',
            source,
            a,
            part,
            [[custody[0].userId!, part]],
            policy?.groupId ?? null
          );
        else {
          const ids = policy?.shared ? membersAt(policy.groupId, a) : [];
          post(
            asset,
            'sharedDepreciation',
            source,
            a,
            part,
            share(part, ids),
            policy?.groupId ?? null
          );
        }
      }
    }
  };

  for (const asset of data.assets) {
    const source = `asset:${asset.id}`;
    const cost = reportingCents(asset.cost, asset.currency, asset.exchangeRate);
    const purchased = asset.purchaseDate ? reportDate(asset.purchaseDate) : NaN;
    const disposed = instant(asset.disposedAt);
    if (
      asset.purchaseCount !== 1 ||
      cost == null ||
      !Number.isFinite(purchased)
    ) {
      warn(
        source,
        asset.id,
        asset.purchaseCount > 1
          ? 'Multiple acquisition records need reconciliation.'
          : 'Purchase amount, date, or verified exchange rate is missing.'
      );
      continue;
    }
    if (asset.pillar === 'Software') {
      if (
        !(
          asset.licenseType === 'Perpetual' &&
          data.terms.some(
            (t) =>
              t.assetId === asset.id &&
              t.allocationLifeMonths &&
              instant(t.to) <= start &&
              reportingCents(t.amount, t.currency, t.exchangeRate) != null
          )
        ) &&
        !data.terms.some(
          (t) =>
            t.assetId === asset.id &&
            instant(t.from) < end &&
            instant(t.to) > start
        )
      )
        warn(
          source,
          asset.id,
          'No priced software term covers this report; add its paid coverage or allocation life.'
        );
      continue;
    }
    const life = asset.lifeMonths ?? 60;
    const residual = reportingCents(
      asset.residual ?? '0',
      asset.currency,
      asset.exchangeRate
    );
    if (
      life <= 0 ||
      !Number.isInteger(life) ||
      residual == null ||
      residual > cost
    ) {
      warn(source, asset.id, 'Invalid useful life or residual value.');
      continue;
    }
    const depreciable = cost - residual;
    for (
      let month = monthStart(Math.max(start, purchased));
      month < Math.min(end, disposed);
      month = addMonths(month, 1)
    ) {
      const index = monthDifference(purchased, month);
      if (index < 0 || index >= life) continue;
      const pool =
        roundedRatio(depreciable, index + 1, life) -
        roundedRatio(depreciable, index, life);
      allocateInterval(
        asset,
        source,
        pool,
        month,
        addMonths(month, 1),
        purchased,
        disposed
      );
    }
  }
  for (const term of data.terms) {
    const asset = assets.get(term.assetId);
    if (!asset) continue;
    const source = `term:${term.id}`,
      from = instant(term.from),
      to = instant(term.to);
    const amount = reportingCents(
      term.amount,
      term.currency,
      term.exchangeRate
    );
    if (to <= start || from >= end) continue;
    if (
      amount == null ||
      !Number.isFinite(from) ||
      !Number.isFinite(to) ||
      to <= from ||
      term.seats < 1 ||
      (asset.licenseType === 'Perpetual' && !term.allocationLifeMonths)
    ) {
      warn(
        source,
        asset.id,
        'Software amount, verified FX, capacity, coverage, or perpetual allocation life is missing.'
      );
      continue;
    }
    if (
      (termsByLicense.get(term.licenseId) ?? []).some(
        (other) =>
          other.id !== term.id &&
          instant(other.from) < to &&
          instant(other.to) > from
      )
    ) {
      warn(
        source,
        asset.id,
        'Overlapping software financial terms need reconciliation.'
      );
      continue;
    }
    allocateInterval(
      asset,
      source,
      amount,
      from,
      to,
      from,
      Math.min(to, instant(asset.disposedAt)),
      { id: term.licenseId, seats: term.seats }
    );
  }
  for (const repair of data.repairs) {
    const asset = assets.get(repair.assetId),
      at = instant(repair.completedAt);
    if (!asset) continue;
    const source = `repair:${repair.id}`;
    if (!repair.completedAt) {
      warn(source, asset.id, 'Completed repair has no recognition date.');
      continue;
    }
    if (at < start || at >= end) continue;
    const policy = policyAt(asset.id, at);
    if (options.groupId && policy?.groupId !== options.groupId) continue;
    const amount = reportingCents(
      repair.amount,
      repair.currency,
      repair.exchangeRate
    );
    if (amount == null) {
      warn(
        source,
        asset.id,
        'Repair amount or verified exchange rate is missing.'
      );
      continue;
    }
    const ids = policy ? membersAt(policy.groupId, at) : [];
    post(
      asset,
      'repairs',
      source,
      at,
      amount,
      share(amount, ids),
      policy?.groupId ?? null
    );
  }
  // Participation does not require non-zero cost, so free/fully-depreciated use counts.
  for (const a of data.assignments)
    if (
      assets.has(a.assetId) &&
      a.userId &&
      a.acceptedAt &&
      instant(a.acceptedAt) < end &&
      instant(a.to) > start &&
      !['cancelled', 'rejected'].includes(a.acceptanceStatus ?? '')
    ) {
      if (
        !options.groupId ||
        data.policies.some(
          (p) =>
            p.assetId === a.assetId &&
            p.groupId === options.groupId &&
            instant(p.from) < end &&
            instant(p.to) > start
        )
      )
        enroll(a.userId);
    }
  for (const m of data.memberships)
    if (
      instant(m.from) < end &&
      instant(m.to) > start &&
      (!options.groupId || m.groupId === options.groupId) &&
      data.policies.some(
        (p) =>
          p.groupId === m.groupId &&
          assets.has(p.assetId) &&
          instant(p.from) < end &&
          instant(p.to) > start
      )
    )
      enroll(m.userId);
  for (const a of data.softwareAllocations)
    if (
      instant(a.from) < end &&
      Math.min(instant(a.to), instant(a.expiresAt)) > start &&
      data.assets.some(
        (asset) =>
          asset.licenseId === a.licenseId &&
          (!options.groupId ||
            data.policies.some(
              (p) =>
                p.assetId === asset.id &&
                p.groupId === options.groupId &&
                instant(p.from) < end &&
                instant(p.to) > start
            ))
      )
    )
      enroll(a.userId);

  const periodPeople = new Set(participating);
  for (const asset of data.assets) {
    const purchased = asset.purchaseDate ? reportDate(asset.purchaseDate) : NaN;
    if (
      (Number.isFinite(purchased) && purchased > now) ||
      instant(asset.disposedAt) <= now
    )
      continue;
    const policy = policyAt(asset.id, now);
    if (options.groupId && policy?.groupId !== options.groupId) continue;
    const cost =
      asset.purchaseCount === 1
        ? reportingCents(asset.cost, asset.currency, asset.exchangeRate)
        : null;
    let book = cost,
      recipients: string[] = [],
      denominator = 0,
      kind: PersonAssetValue['kind'] = 'Direct';
    if (asset.pillar === 'Software') {
      if (!asset.licenseId || now >= instant(asset.licenseExpiry)) continue;
      const seats = seatsAt(asset.licenseId, now);
      recipients = [...new Set(seats.map((s) => s.userId))].sort();
      const currentTerm = (termsByLicense.get(asset.licenseId) ?? []).find(
        (t) => active(t, now)
      );
      denominator = currentTerm?.seats ?? asset.totalSeats ?? 0;
      kind = 'Software seat';
      if (
        seats.length !== recipients.length ||
        recipients.length > denominator
      ) {
        warn(
          `asset:${asset.id}`,
          asset.id,
          'Current software allocations exceed verified seat capacity.'
        );
        book = null;
        denominator = 0;
      }
    } else {
      const life = asset.lifeMonths ?? 60,
        residual = reportingCents(
          asset.residual ?? '0',
          asset.currency,
          asset.exchangeRate
        );
      if (
        cost == null ||
        life <= 0 ||
        residual == null ||
        residual > cost ||
        !Number.isFinite(purchased)
      )
        book = null;
      else
        book =
          cost -
          roundedRatio(
            cost - residual,
            Math.min(life, Math.max(0, monthDifference(purchased, now))),
            life
          );
      const custody = custodyAt(asset.id, now);
      if (custody.length > 1) {
        warn(
          `asset:${asset.id}`,
          asset.id,
          'Overlapping current custody; current value shares are unavailable.'
        );
        continue;
      }
      recipients = custody.length
        ? [custody[0].userId!]
        : policy?.shared
          ? membersAt(policy.groupId, now)
          : [];
      kind = custody.length ? 'Direct' : 'Shared';
      denominator = recipients.length;
    }
    const acquisitionShares = new Map(
      share(cost ?? BigInt(0), recipients, denominator)
    );
    const bookShares = new Map(
      share(book ?? BigInt(0), recipients, denominator)
    );
    for (const id of recipients) {
      if (!enroll(id)) continue;
      const current = values.get(id)!;
      current.assets.add(asset.id);
      if (asset.pillar === 'Software') current.seats.add(asset.licenseId!);
      const acquisitionShare =
        cost != null && denominator > 0
          ? (acquisitionShares.get(id) ?? null)
          : null;
      const bookShare =
        book != null && denominator > 0 ? (bookShares.get(id) ?? null) : null;
      current.acquisition += acquisitionShare ?? BigInt(0);
      current.book += bookShare ?? BigInt(0);
      if (
        options.detailPersonId !== null &&
        (!options.detailPersonId || options.detailPersonId === id)
      )
        (currentAssets[id] ??= []).push({
          assetId: asset.id,
          assetTag: asset.tag,
          kind,
          acquisitionShare:
            acquisitionShare == null ? null : money(acquisitionShare),
          bookShare: bookShare == null ? null : money(bookShare),
          wholeAcquisitionValue: cost == null ? null : money(cost),
          wholeBookValue: book == null ? null : money(book),
        });
    }
  }

  const affected = new Set([...exceptions.values()].map((e) => e.assetId));
  const affectedGroups = new Set(
    data.policies.filter((p) => affected.has(p.assetId)).map((p) => p.groupId)
  );
  const rows: PersonCostRow[] = [...participating]
    .map((id) => {
      const value = values.get(id)!,
        cost = costs.get(id)!;
      const incomplete =
        data.memberships.some(
          (m) =>
            m.userId === id &&
            affectedGroups.has(m.groupId) &&
            instant(m.from) < end &&
            instant(m.to) > start
        ) ||
        data.assignments.some(
          (a) => a.userId === id && affected.has(a.assetId)
        ) ||
        (details[id] ?? []).some((d) => affected.has(d.assetId)) ||
        data.softwareAllocations.some(
          (a) =>
            a.userId === id &&
            data.assets.some(
              (asset) =>
                asset.licenseId === a.licenseId && affected.has(asset.id)
            )
        );
      return {
        ...people.get(id)!,
        eligibleInPeriod: periodPeople.has(id),
        directDepreciation: money(cost.directDepreciation),
        sharedDepreciation: money(cost.sharedDepreciation),
        software: money(cost.software),
        repairs: money(cost.repairs),
        totalCost: money(
          Object.values(cost).reduce((a, b) => a + b, BigInt(0))
        ),
        currentAcquisitionValue: money(value.acquisition),
        currentBookValue: money(value.book),
        assetCount: value.assets.size,
        softwareSeats: value.seats.size,
        incomplete,
      };
    })
    .sort(
      (a, b) =>
        b.totalCost - a.totalCost ||
        a.name.localeCompare(b.name) ||
        a.id.localeCompare(b.id)
    );
  const coverage = data.groups.map((g) => g.coverageFrom).sort()[0] ?? null;
  if (coverage && start < instant(coverage))
    warn(
      'coverage',
      null,
      `Shared membership history is reliable from ${localDate(instant(coverage))}; earlier shared costs remain unallocated.`
    );
  return {
    people: rows,
    details,
    currentAssets,
    summary: {
      sourceCost: money(sourceTotal),
      allocatedCost: money(allocatedTotal),
      overheadCost: money(unallocated + unused),
      unusedSoftwareCost: money(unused),
      unallocatedCost: money(unallocated),
      peopleCount: periodPeople.size,
      averageCost: periodPeople.size
        ? Math.round((money(allocatedTotal) / periodPeople.size) * 100) / 100
        : 0,
      currentAcquisitionValue: money(
        [...values.values()].reduce((n, v) => n + v.acquisition, BigInt(0))
      ),
      currentBookValue: money(
        [...values.values()].reduce((n, v) => n + v.book, BigInt(0))
      ),
      incompleteRecords: exceptions.size,
    },
    trend: [...trends]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({
        month,
        allocated: money(v.allocated),
        overhead: money(v.overhead),
        total: money(v.allocated + v.overhead),
      })),
    exceptions: [...exceptions.values()],
    metadata: {
      generatedAt: options.asOf,
      asOf: options.asOf,
      from: options.from,
      to: options.to,
      timezone: REPORTING_TIMEZONE,
      policyVersion: 'per-head-v1',
      currency: 'LKR',
      coverageFrom: coverage,
      fxBasis:
        'Recorded transaction rates to LKR; missing rates excluded and reported.',
    },
  };
}
