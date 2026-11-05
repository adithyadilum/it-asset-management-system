import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { PerHeadDataset } from '@/types/per-head-costs';
import {
  getPerHeadCostLedger,
  getPersonCostBreakdown,
  exportPerHeadCosts,
} from './per-head-costs';
import {
  createFinancialGroup,
  getFinancialConfiguration,
  saveAssetCostPolicy,
  saveFinancialMembership,
  saveSoftwareFinancialTerm,
  correctAssetCostBasis,
  correctRecordedExchangeRate,
} from './financial-configuration';

const state = vi.hoisted(() => ({ role: 'GlobalAdmin', load: vi.fn() }));
vi.mock('@/db', () => ({ db: {} }));
vi.mock('@/actions/auth', () => ({
  enforceActionAccess: vi.fn(async (predicate: (role: string) => boolean) => {
    if (!predicate(state.role)) throw new Error('Forbidden');
    return { id: 'admin', role: state.role };
  }),
}));
vi.mock('@/lib/data/per-head-costs-repo', () => ({
  loadPerHeadDataset: (...args: unknown[]) => state.load(...args),
}));
vi.mock('@/lib/audit', () => ({
  logAuditAction: vi.fn(),
  logAuditActionTx: vi.fn(),
}));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));
vi.mock('@/lib/capture-reporting-rate', () => ({
  captureReportingRate: vi.fn(),
}));

const a = '00000000-0000-4000-8000-000000000001',
  b = '00000000-0000-4000-8000-000000000002';
const query = { from: '2026-11-01', to: '2026-11-30', page: 1, pageSize: 16 };
const at = (date: string) => `${date}T00:00:00+05:30`;
const data: PerHeadDataset = {
  people: [
    { id: a, name: '=Person A', email: 'a@example.com', department: 'IT' },
    { id: b, name: 'Person B', email: 'b@example.com', department: 'IT' },
  ],
  assets: [
    {
      id: 'asset',
      tag: 'PC-1',
      name: 'PC',
      category: 'Computer',
      pillar: 'Hardware',
      purchaseDate: '2026-11-01',
      cost: '36000',
      currency: 'LKR',
      exchangeRate: '1',
      residual: '0',
      lifeMonths: 12,
      disposedAt: null,
      purchaseCount: 1,
    },
  ],
  assignments: [],
  groups: [
    {
      id: 1,
      name: 'IT',
      departmentId: 1,
      locationId: null,
      coverageFrom: at('2026-11-01'),
    },
  ],
  memberships: [a, b].map((userId, i) => ({
    id: i,
    userId,
    groupId: 1,
    from: at('2026-11-01'),
    to: null,
    reason: 'Rollout',
  })),
  policies: [
    {
      id: 1,
      assetId: 'asset',
      groupId: 1,
      shared: true,
      from: at('2026-11-01'),
      to: null,
    },
  ],
  terms: [],
  softwareAllocations: [],
  repairs: [],
};

describe('per-head financial action boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.role = 'GlobalAdmin';
    state.load.mockResolvedValue(data);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-12-01T00:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());
  it('keeps shared allocation denominators unchanged when searching for one person', async () => {
    const all = await getPerHeadCostLedger(query),
      filtered = await getPerHeadCostLedger({
        ...query,
        search: 'a@example.com',
      });
    expect(filtered.data[0].totalCost).toBe(
      all.data.find((p) => p.id === a)?.totalCost
    );
    expect(filtered.summary.allocatedCost).toBe(1500);
    expect(filtered.summary.otherPeopleCost).toBe(1500);
    expect(filtered.summary.sourceCost).toBe(3000);
  });
  it('paginates after aggregation while keeping full filtered summary totals', async () => {
    const first = await getPerHeadCostLedger({ ...query, pageSize: 1 }),
      second = await getPerHeadCostLedger({ ...query, pageSize: 1, page: 2 });
    expect(first.data[0].id).not.toBe(second.data[0].id);
    expect(first.meta.totalPages).toBe(2);
    expect(second.summary.allocatedCost).toBe(3000);
  });
  it('exports all matching people with formula-safe CSV and report metadata', async () => {
    const csv = await exportPerHeadCosts({ ...query, pageSize: 1 });
    expect(csv).toContain("'=Person A");
    expect(csv).toContain('b@example.com');
    expect(csv).toContain('Asia/Colombo');
  });
  it('allows auditors to read reports and details but rejects every configuration mutation', async () => {
    state.role = 'FinancialAuditor';
    expect((await getPersonCostBreakdown(query, a)).person.totalCost).toBe(
      1500
    );
    for (const action of [
      () => getFinancialConfiguration(),
      () => createFinancialGroup({} as never),
      () => saveFinancialMembership({} as never),
      () => saveAssetCostPolicy({} as never),
      () => saveSoftwareFinancialTerm({} as never),
      () => correctRecordedExchangeRate({} as never),
      () => correctAssetCostBasis({} as never),
    ])
      await expect(action()).rejects.toThrow('Forbidden');
  });
  it('blocks operators and employees before loading person-level financial data', async () => {
    for (const role of ['ITOperator', 'Employee']) {
      state.role = role;
      await expect(getPerHeadCostLedger(query)).rejects.toThrow('Forbidden');
      await expect(exportPerHeadCosts(query)).rejects.toThrow('Forbidden');
      await expect(getPersonCostBreakdown(query, a)).rejects.toThrow(
        'Forbidden'
      );
    }
    expect(state.load).not.toHaveBeenCalled();
  });
  it('validates calendar dates and bounded report ranges before reading source data', async () => {
    await expect(
      getPerHeadCostLedger({ ...query, from: '2026-02-30' })
    ).rejects.toThrow();
    await expect(
      getPerHeadCostLedger({ ...query, from: '2010-01-01' })
    ).rejects.toThrow();
    expect(state.load).not.toHaveBeenCalled();
  });
});
