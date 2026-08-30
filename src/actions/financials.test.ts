import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getDepreciationLedger,
  getTCOLedger,
  getWriteOffsLedger,
} from '@/actions/financials';
import {
  ADMIN_USER,
  EMPLOYEE_USER,
  IT_OPERATOR_USER,
} from '@/test/fixtures/users';

const mockGetAuthenticatedUser = vi.fn();
vi.mock('@/actions/auth', () => ({
  getAuthenticatedUser: () => mockGetAuthenticatedUser(),
  enforceActionAccess: vi.fn(async (validator) => {
    const user = await mockGetAuthenticatedUser();
    if (!user) throw new Error('Unauthorized');
    if (validator && !validator(user.role)) throw new Error('Forbidden');
    return user;
  }),
}));

const { mockDb, chain } = vi.hoisted(() => {
  const chain = (resolvedValue: unknown = []) => {
    const c: Record<string, ReturnType<typeof vi.fn>> = {};
    [
      'values',
      'set',
      'where',
      'returning',
      'limit',
      'offset',
      'innerJoin',
      'leftJoin',
      'orderBy',
      'from',
      'groupBy',
    ].forEach((m) => (c[m] = vi.fn().mockReturnThis()));
    c.returning = vi.fn().mockResolvedValue(resolvedValue);
    const proxy = new Proxy(c, {
      get(t, p) {
        if (p === 'then') return (r: (v: unknown) => void) => r(resolvedValue);
        return t[p as string];
      },
    });
    return proxy;
  };

  const db = {
    select: vi.fn().mockReturnValue(chain([])),
    $with: vi
      .fn()
      .mockReturnValue({ as: vi.fn().mockReturnValue('repair_costs_sq') }),
    with: vi
      .fn()
      .mockReturnValue({ select: vi.fn().mockReturnValue(chain([])) }),
  };
  return { mockDb: db, chain };
});

vi.mock('@/db', () => ({ db: mockDb }));

vi.mock('@/db/schema', () => ({
  assets: { id: 'assets.id', status: 'assets.status' },
  categories: { id: 'categories.id', name: 'categories.name' },
  models: { id: 'models.id', categoryId: 'models.categoryId' },
  assetPurchases: {
    assetId: 'assetPurchases.assetId',
    purchaseDate: 'assetPurchases.purchaseDate',
  },
  maintenanceTickets: {
    assetId: 'maintenanceTickets.assetId',
    status: 'maintenanceTickets.status',
  },
  assetDisposals: {
    assetId: 'assetDisposals.assetId',
    status: 'assetDisposals.status',
  },
}));

describe('Financials Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('RBAC Guards', () => {
    it('restricts access to FinancialAuditor and GlobalAdmin for getDepreciationLedger', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
      await expect(getDepreciationLedger()).rejects.toThrow('Forbidden');

      mockGetAuthenticatedUser.mockResolvedValue(IT_OPERATOR_USER);
      await expect(getDepreciationLedger()).rejects.toThrow('Forbidden');
    });

    it('allows FinancialAuditor and GlobalAdmin', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
      mockDb.select.mockReturnValueOnce(chain([]));

      const res = await getDepreciationLedger();
      expect(res.data).toEqual([]);
    });
  });

  describe('getDepreciationLedger', () => {
    it('correctly calculates Current Book Value and handles pagination', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
      mockDb.select.mockReturnValueOnce(
        chain([
          {
            totalCount: 100,
            id: 1,
            assetTag: 'TAG-1',
            categoryName: 'Hardware',
            purchaseDate: new Date().toISOString(),
            originalPrice: '1200',
            currencyCode: 'USD',
            usefulLifeMonths: 12,
          },
        ])
      ); // data

      const result = await getDepreciationLedger({ page: 2, pageSize: 10 });

      expect(result.meta.total).toBe(100);
      expect(result.meta.page).toBe(2);
      expect(result.data.length).toBe(1);
      expect(result.data[0].originalPrice).toBe(1200);
      expect(result.data[0].currentBookValue).toBeDefined();
    });
  });

  describe('getTCOLedger', () => {
    it('calculates Total TCO (Purchase + Maintenance)', async () => {
      mockGetAuthenticatedUser.mockResolvedValue({
        id: 'f',
        role: 'FinancialAuditor',
      });

      // Three `db.with(...).select(...)` calls now: the page of rows, the
      // summary totals, and the dated repairs behind the trend chart. Each
      // needs the same CTE declared on its own statement.
      mockDb.with.mockReturnValue({
        select: vi
          .fn()
          .mockReturnValueOnce(
            chain([
              {
                totalCount: 1,
                id: 1,
                assetTag: 'TAG-2',
                categoryName: 'Hardware',
                purchaseDate: new Date().toISOString(),
                originalPrice: '1000',
                currencyCode: 'USD',
                totalRepairCosts: '250',
              },
            ])
          )
          .mockReturnValueOnce(
            chain([
              {
                originalPrice: '1000',
                currencyCode: 'USD',
                totalRepairCosts: '250',
                purchaseDate: '2024-03-15T00:00:00.000Z',
              },
            ])
          )
          .mockReturnValueOnce(
            chain([
              {
                completedAt: new Date('2024-05-20T00:00:00.000Z'),
                actualCost: '250',
                currencyCode: 'USD',
              },
            ])
          ),
      });

      const result = await getTCOLedger();

      expect(result.data.length).toBe(1);
      expect(result.data[0].originalPrice).toBe(1000);
      expect(result.data[0].totalRepairCosts).toBe(250);
      expect(result.data[0].totalTCO).toBe(1250);

      // The summary covers everything the filters match, so it is computed by
      // its own query rather than added up from the page.
      expect(result.summary.assetCount).toBe(1);
      expect(result.summary.totalTCO).toBeGreaterThan(0);
    });

    it('accumulates the trend series across months', async () => {
      mockGetAuthenticatedUser.mockResolvedValue({
        id: 'f',
        role: 'FinancialAuditor',
      });

      mockDb.with.mockReturnValue({
        select: vi
          .fn()
          .mockReturnValueOnce(chain([]))
          .mockReturnValueOnce(
            chain([
              {
                originalPrice: '1000',
                currencyCode: 'USD',
                purchaseDate: '2024-03-15T00:00:00.000Z',
                totalRepairCosts: '250',
              },
            ])
          )
          .mockReturnValueOnce(
            chain([
              {
                completedAt: new Date('2024-05-20T00:00:00.000Z'),
                actualCost: '100',
                currencyCode: 'USD',
              },
              {
                completedAt: new Date('2024-07-02T00:00:00.000Z'),
                actualCost: '150',
                currencyCode: 'USD',
              },
            ])
          ),
      });

      const result = await getTCOLedger();

      expect(result.trend.map((p) => p.month)).toEqual([
        '2024-03',
        '2024-05',
        '2024-07',
      ]);
      // Purchase lands once and holds; maintenance keeps accruing on top.
      expect(result.trend[0].maintenance).toBe(0);
      expect(result.trend[2].purchase).toBe(result.trend[0].purchase);
      expect(result.trend[2].maintenance).toBeGreaterThan(
        result.trend[1].maintenance
      );
      // Total is the two components, at every point.
      for (const point of result.trend) {
        expect(point.total).toBeCloseTo(point.purchase + point.maintenance, 2);
      }
    });
  });

  describe('getWriteOffsLedger', () => {
    it('retrieves only disposed assets with salvage value', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);

      mockDb.select.mockReturnValueOnce(
        chain([
          {
            totalCount: 1,
            id: 1,
            assetTag: 'TAG-3',
            categoryName: 'Hardware',
            disposalDate: new Date().toISOString(),
            originalPrice: '2000',
            currencyCode: 'USD',
            bookValueAtDisposal: '500',
            estimatedSalvageValue: '80',
            actualSalvageValue: '100',
          },
        ])
      );

      const result = await getWriteOffsLedger();

      expect(result.data.length).toBe(1);
      expect(result.data[0].estimatedSalvageValue).toBe(80);
      expect(result.data[0].actualSalvageValue).toBe(100);
      expect(result.data[0].bookValue).toBe(500);
    });
  });
});
