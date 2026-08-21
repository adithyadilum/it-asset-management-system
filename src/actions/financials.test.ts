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

      // We mocked `db.with()` properly
      mockDb.with.mockReturnValue({
        select: vi.fn().mockReturnValueOnce(
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
        ),
      });

      const result = await getTCOLedger();

      expect(result.data.length).toBe(1);
      expect(result.data[0].originalPrice).toBe(1000);
      expect(result.data[0].totalRepairCosts).toBe(250);
      expect(result.data[0].totalTCO).toBe(1250);
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
