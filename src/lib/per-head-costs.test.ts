import { describe, expect, it } from 'vitest';
import type { PerHeadDataset } from '@/types/per-head-costs';
import { calculatePerHeadCosts, reportingCents } from './per-head-costs';

const at = (day: string) => `${day}T00:00:00+05:30`;
const period = {
  from: '2026-11-01',
  to: '2026-11-30',
  asOf: '2026-12-01T00:00:00Z',
};
function fixture(): PerHeadDataset {
  return {
    people: [
      { id: 'a', name: 'A', email: 'a@example.com', department: 'IT' },
      { id: 'b', name: 'B', email: 'b@example.com', department: 'IT' },
    ],
    assets: [
      {
        id: 'pc',
        tag: 'PC-1',
        name: 'Laptop',
        category: 'Laptop',
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
    assignments: [
      {
        id: 1,
        assetId: 'pc',
        userId: 'a',
        from: at('2026-11-01'),
        to: at('2026-11-11'),
        acceptedAt: at('2026-11-01'),
        acceptanceStatus: 'transferred',
      },
      {
        id: 2,
        assetId: 'pc',
        userId: 'b',
        from: at('2026-11-11'),
        to: null,
        acceptedAt: at('2026-11-11'),
        acceptanceStatus: 'accepted',
      },
    ],
    groups: [
      {
        id: 1,
        name: 'IT',
        departmentId: 1,
        locationId: null,
        coverageFrom: at('2026-11-01'),
      },
    ],
    memberships: [
      {
        id: 1,
        groupId: 1,
        userId: 'a',
        from: at('2026-11-01'),
        to: null,
        reason: 'Rollout',
      },
      {
        id: 2,
        groupId: 1,
        userId: 'b',
        from: at('2026-11-01'),
        to: null,
        reason: 'Rollout',
      },
    ],
    policies: [
      {
        id: 1,
        assetId: 'pc',
        groupId: 1,
        shared: false,
        from: at('2026-11-01'),
        to: null,
      },
    ],
    terms: [],
    softwareAllocations: [],
    repairs: [],
  };
}
const row = (report: ReturnType<typeof calculatePerHeadCosts>, id: string) =>
  report.people.find((p) => p.id === id)!;
const balances = (report: ReturnType<typeof calculatePerHeadCosts>) =>
  expect(report.summary.sourceCost).toBeCloseTo(
    report.summary.allocatedCost + report.summary.overheadCost,
    2
  );

describe('per-head cost allocation', () => {
  it('splits transfers by accepted custody, preserving transferred acceptance and current values separately', () => {
    const report = calculatePerHeadCosts(fixture(), period);
    expect(row(report, 'a').directDepreciation).toBe(1000);
    expect(row(report, 'b').directDepreciation).toBe(2000);
    expect(row(report, 'a').currentAcquisitionValue).toBe(0);
    expect(row(report, 'b').currentAcquisitionValue).toBe(36000);
    expect(row(report, 'b').currentBookValue).toBe(33000);
    balances(report);
  });
  it('starts at acceptance; pending, rejected, and cancelled intervals never incur personal cost', () => {
    const data = fixture();
    data.assignments = [
      {
        ...data.assignments[0],
        to: null,
        acceptedAt: null,
        acceptanceStatus: null,
      },
    ];
    const report = calculatePerHeadCosts(data, period);
    expect(report.summary.allocatedCost).toBe(0);
    expect(report.summary.unallocatedCost).toBe(3000);
    balances(report);
    for (const status of ['rejected', 'cancelled']) {
      data.assignments[0].acceptedAt = at('2026-11-01');
      data.assignments[0].acceptanceStatus = status;
      expect(calculatePerHeadCosts(data, period).summary.allocatedCost).toBe(0);
    }
  });
  it('prorates a partial purchase month by owned days', () => {
    const data = fixture();
    data.assets[0].purchaseDate = '2026-11-16';
    data.assignments = [
      { ...data.assignments[1], acceptedAt: at('2026-11-16') },
    ];
    expect(calculatePerHeadCosts(data, period).summary.sourceCost).toBe(1500);
  });
  it('splits a shared pool when membership changes without double-charging direct custody', () => {
    const data = fixture();
    data.assignments = [];
    data.policies[0].shared = true;
    data.memberships[1].from = at('2026-11-16');
    const report = calculatePerHeadCosts(data, period);
    expect(row(report, 'a').sharedDepreciation).toBe(2250);
    expect(row(report, 'b').sharedDepreciation).toBe(750);
    balances(report);
  });
  it('keeps empty groups and periods before rollout unallocated', () => {
    const data = fixture();
    data.assignments = [];
    data.policies[0].shared = true;
    data.groups[0].coverageFrom = at('2026-12-01');
    const report = calculatePerHeadCosts(data, period);
    expect(report.summary.overheadCost).toBe(3000);
    expect(report.exceptions.some((e) => e.source === 'coverage')).toBe(true);
    balances(report);
  });
  it('recognizes repairs as overhead for the completion group rather than charging the prior custodian', () => {
    const data = fixture();
    data.repairs = [
      {
        id: 1,
        assetId: 'pc',
        amount: '10',
        currency: 'USD',
        exchangeRate: '300',
        completedAt: at('2026-11-25'),
      },
    ];
    const report = calculatePerHeadCosts(data, period);
    expect(row(report, 'a').repairs).toBe(1500);
    expect(row(report, 'b').repairs).toBe(1500);
    balances(report);
  });
  it('divides software by purchased seats and retains unused seats as overhead', () => {
    const data = fixture();
    Object.assign(data.assets[0], {
      pillar: 'Software',
      licenseId: 'lic',
      licenseType: 'Subscription',
      totalSeats: 3,
    });
    data.assignments = [];
    data.terms = [
      {
        id: 1,
        assetId: 'pc',
        licenseId: 'lic',
        amount: '6000',
        currency: 'LKR',
        exchangeRate: '1',
        seats: 3,
        allocationLifeMonths: null,
        from: at('2026-11-01'),
        to: at('2026-12-01'),
      },
    ];
    data.softwareAllocations = ['a', 'b'].map((userId, i) => ({
      id: i,
      licenseId: 'lic',
      userId,
      from: at('2026-11-01'),
      to: null,
      expiresAt: null,
    }));
    const report = calculatePerHeadCosts(data, period);
    expect(row(report, 'a').software).toBe(2000);
    expect(row(report, 'b').software).toBe(2000);
    expect(report.summary.unusedSoftwareCost).toBe(2000);
    expect(report.summary.sourceCost).toBe(6000);
    balances(report);
    data.softwareAllocations[1].to = at('2026-11-16');
    const revoked = calculatePerHeadCosts(data, period);
    expect(row(revoked, 'b').software).toBe(1000);
    expect(revoked.summary.unusedSoftwareCost).toBe(3000);
    balances(revoked);
  });
  it('does not invent amounts for software without financial terms or for suspect acquisition FX', () => {
    const data = fixture();
    data.assets[0].currency = 'USD';
    data.assets[0].exchangeRate = '1';
    const report = calculatePerHeadCosts(data, period);
    expect(report.summary.sourceCost).toBe(0);
    expect(report.exceptions).toHaveLength(1);
    expect(row(report, 'a').incomplete).toBe(true);
    data.assets[0].pillar = 'Software';
    data.assets[0].currency = 'LKR';
    expect(
      calculatePerHeadCosts(data, period).exceptions.some((e) =>
        e.message.includes('software term')
      )
    ).toBe(true);
  });
  it('rejects duplicate acquisition records and does not multiply overlapping custody', () => {
    const data = fixture();
    data.assets[0].purchaseCount = 2;
    expect(calculatePerHeadCosts(data, period).summary.sourceCost).toBe(0);
    data.assets[0].purchaseCount = 1;
    data.assignments[0].to = null;
    const report = calculatePerHeadCosts(data, period);
    expect(report.summary.unallocatedCost).toBe(2000);
    balances(report);
  });
  it('reconciles cent residuals deterministically across a membership split', () => {
    const data = fixture();
    data.assignments = [];
    data.policies[0].shared = true;
    data.assets[0].cost = '0.12';
    data.memberships[1].from = at('2026-11-02');
    const first = calculatePerHeadCosts(data, period),
      second = calculatePerHeadCosts(data, period);
    expect(first).toEqual(second);
    balances(first);
    expect(first.summary.sourceCost).toBe(0.01);
  });
  it('supports leap months and stops at disposal while retaining historical costs', () => {
    const data = fixture();
    data.assets[0].purchaseDate = '2024-02-01';
    data.assets[0].disposedAt = at('2024-02-16');
    data.assignments = [
      {
        ...data.assignments[0],
        from: at('2024-02-01'),
        acceptedAt: at('2024-02-01'),
        to: null,
      },
    ];
    const report = calculatePerHeadCosts(data, {
      from: '2024-02-01',
      to: '2024-02-29',
      asOf: '2026-12-01T00:00:00Z',
    });
    expect(report.summary.sourceCost).toBe(1551.72);
    expect(row(report, 'a').currentBookValue).toBe(0);
    balances(report);
  });
  it('keeps fully depreciated eligible people at zero cost and permits repairs', () => {
    const data = fixture();
    data.assets[0].purchaseDate = '2020-01-01';
    const report = calculatePerHeadCosts(data, period);
    expect(report.summary.peopleCount).toBe(2);
    expect(report.summary.allocatedCost).toBe(0);
  });
  it('uses exact recorded decimal FX and distinguishes known zero from unknown', () => {
    expect(reportingCents('0.01', 'USD', '300.123456')).toBe(BigInt(300));
    expect(reportingCents('0', 'LKR', null)).toBe(BigInt(0));
    expect(reportingCents(null, 'LKR', '1')).toBeNull();
  });
});
