'use server';

import { enforceActionAccess } from '@/actions/auth';
import { canAccessFinancials } from '@/lib/auth/roles';
import { loadPerHeadDataset } from '@/lib/data/per-head-costs-repo';
import { calculatePerHeadCosts } from '@/lib/per-head-costs';
import {
  perHeadQuerySchema,
  type PerHeadQuery,
} from '@/lib/validations/per-head-costs';
import { csvCell } from '@/lib/csv';
import { logAuditAction } from '@/lib/audit';
import { z } from 'zod';
import { localDate } from '@/lib/reporting-time';

export async function getInitialPerHeadCostReport() {
  const user = await enforceActionAccess(canAccessFinancials);
  const today = localDate(Date.now());
  const query = {
    from: `${today.slice(0, 7)}-01`,
    to: today,
    page: 1,
    pageSize: 16,
  };
  const [data, filterOptions] = await Promise.all([
    getPerHeadCostLedger(query),
    getPerHeadCostFilterOptions(),
  ]);
  return {
    data,
    query,
    filterOptions,
    canConfigure: user.role === 'GlobalAdmin',
  };
}

async function buildReport(
  input: PerHeadQuery,
  detailPersonId: string | null = null
) {
  const query = perHeadQuerySchema.parse(input);
  const data = await loadPerHeadDataset(query);
  const report = calculatePerHeadCosts(data, {
    ...query,
    asOf: new Date().toISOString(),
    detailPersonId,
  });
  const search = query.search.toLocaleLowerCase();
  const people = report.people.filter((p) =>
    `${p.name} ${p.email} ${p.department ?? ''}`
      .toLocaleLowerCase()
      .includes(search)
  );
  people.sort((a, b) =>
    query.sort === 'name'
      ? a.name.localeCompare(b.name) || a.id.localeCompare(b.id)
      : (query.sort === 'value'
          ? b.currentAcquisitionValue - a.currentAcquisitionValue
          : b.totalCost - a.totalCost) || a.id.localeCompare(b.id)
  );
  const allocatedCost =
    Math.round(people.reduce((sum, p) => sum + p.totalCost, 0) * 100) / 100;
  const currentAcquisitionValue =
    Math.round(
      people.reduce((sum, p) => sum + p.currentAcquisitionValue, 0) * 100
    ) / 100;
  const currentBookValue =
    Math.round(people.reduce((sum, p) => sum + p.currentBookValue, 0) * 100) /
    100;
  return {
    query,
    report,
    people,
    summary: {
      ...report.summary,
      allocatedCost,
      currentAcquisitionValue,
      currentBookValue,
      peopleCount: people.filter((p) => p.eligibleInPeriod).length,
      averageCost: people.some((p) => p.eligibleInPeriod)
        ? Math.round(
            (allocatedCost / people.filter((p) => p.eligibleInPeriod).length) *
              100
          ) / 100
        : 0,
      otherPeopleCost:
        Math.round((report.summary.allocatedCost - allocatedCost) * 100) / 100,
    },
  };
}

export async function getPerHeadCostLedger(input: PerHeadQuery) {
  await enforceActionAccess(canAccessFinancials);
  const { query, report, people, summary } = await buildReport(input);
  return {
    data: people.slice(
      (query.page - 1) * query.pageSize,
      query.page * query.pageSize
    ),
    summary,
    trend: report.trend,
    exceptions: report.exceptions,
    metadata: report.metadata,
    meta: {
      total: people.length,
      totalPages: Math.ceil(people.length / query.pageSize),
      page: query.page,
      pageSize: query.pageSize,
    },
  };
}

export async function getPersonCostBreakdown(
  input: PerHeadQuery,
  personId: string
) {
  await enforceActionAccess(canAccessFinancials);
  z.string().uuid().parse(personId);
  const { report, people } = await buildReport(input, personId);
  const person = people.find((p) => p.id === personId);
  if (!person) throw new Error('Person not found in this report.');
  return {
    person,
    details: report.details[personId] ?? [],
    currentAssets: report.currentAssets[personId] ?? [],
    metadata: report.metadata,
  };
}

export async function getPerHeadCostFilterOptions() {
  await enforceActionAccess(canAccessFinancials);
  const { db } = await import('@/db');
  const { financialGroups, categories } = await import('@/db/schema');
  const [groups, categoryRows] = await Promise.all([
    db.select().from(financialGroups).orderBy(financialGroups.name),
    db
      .select({ name: categories.name, pillar: categories.pillar })
      .from(categories)
      .orderBy(categories.name),
  ]);
  return {
    groups: groups.map((g) => ({
      id: g.id,
      name: `${g.departmentId ? 'Department' : 'Location'}: ${g.name}`,
    })),
    categories: categoryRows,
  };
}

export async function exportPerHeadCosts(input: PerHeadQuery) {
  const user = await enforceActionAccess(canAccessFinancials);
  const { people, report } = await buildReport(input);
  const headers = [
    'Person',
    'Email',
    'Current department',
    'Period start',
    'Period end',
    'Direct depreciation (LKR)',
    'Shared depreciation (LKR)',
    'Software expense (LKR)',
    'Repair overhead (LKR)',
    'Total usage cost (LKR)',
    'Current acquisition value share (LKR)',
    'Current book value share (LKR)',
    'Data status',
    'Generated at',
    'Timezone',
    'Policy version',
  ];
  const rows = people.map((p) => [
    p.name,
    p.email,
    p.department,
    input.from,
    input.to,
    p.directDepreciation,
    p.sharedDepreciation,
    p.software,
    p.repairs,
    p.totalCost,
    p.currentAcquisitionValue,
    p.currentBookValue,
    p.incomplete ? 'Incomplete' : 'Known costs',
    report.metadata.generatedAt,
    report.metadata.timezone,
    report.metadata.policyVersion,
  ]);
  await logAuditAction({
    entityType: 'FinancialReport',
    entityId: 'per-head',
    actionType: 'REPORT_EXPORTED',
    performedById: user.id,
    newData: { from: input.from, to: input.to, people: people.length },
  });
  return (
    '\ufeff' +
    [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
  );
}
