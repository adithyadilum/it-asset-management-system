import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchReportPreview, getStandardReportsFilterOptions } from '@/actions/standard-reports';
import { ADMIN_USER, EMPLOYEE_USER } from '@/test/fixtures/users';

const mockGetAuthenticatedUser = vi.fn();
vi.mock('@/actions/auth', () => ({
  getAuthenticatedUser: () => mockGetAuthenticatedUser(),
}));

vi.mock('@/lib/latency', () => ({
  startLatencyTimer: vi.fn().mockReturnValue(0),
  logLatency: vi.fn(),
  logError: vi.fn(),
}));

const { mockDb, chain } = vi.hoisted(() => {
  const chain = (resolvedValue: unknown = []) => {
    const c: Record<string, ReturnType<typeof vi.fn>> = {};
    ['values', 'set', 'where', 'returning', 'limit', 'offset', 'innerJoin', 'leftJoin', 'orderBy', 'from', 'groupBy'].forEach(
      (m) => (c[m] = vi.fn().mockReturnThis())
    );
    // Add dynamic for drizzle dynamic query building
    c.$dynamic = vi.fn().mockReturnThis();
    
    // Add execute for getting counts
    c.execute = vi.fn().mockResolvedValue([]);
    
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
  };
  return { mockDb: db, chain };
});

vi.mock('@/db', () => ({ db: mockDb }));

vi.mock('@/db/schema', () => ({
  assetAssignments: { id: 'assetAssignments.id', returnedDate: 'assetAssignments.returnedDate' },
  assets: { id: 'assets.id', status: 'assets.status', isArchived: 'assets.isArchived' },
  categories: { id: 'categories.id', name: 'categories.name', pillar: 'categories.pillar', isActive: 'categories.isActive' },
  locations: { id: 'locations.id', isActive: 'locations.isActive' },
  models: { id: 'models.id' },
  users: { id: 'users.id', name: 'users.name' },
  brands: { id: 'brands.id' },
  vendors: { id: 'vendors.id' },
  owners: { id: 'owners.id' },
  assetPurchases: { id: 'assetPurchases.id' },
  maintenanceTickets: { id: 'maintenanceTickets.id' },
  assetDisposals: { id: 'assetDisposals.id' },
  softwareLicenses: { id: 'softwareLicenses.id' },
  softwareAllocations: { id: 'softwareAllocations.id' },
  systemAuditLogs: { id: 'systemAuditLogs.id' },
  customStatuses: { id: 'customStatuses.id', name: 'customStatuses.name', isActive: 'customStatuses.isActive' },
}));

describe('Standard Reports Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getStandardReportsFilterOptions', () => {
    it('throws unauthorized for unauthorized user', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
      await expect(getStandardReportsFilterOptions()).rejects.toThrow('Forbidden');
    });

    it('returns options for admin', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
      mockDb.select.mockReturnValueOnce(chain([{ name: 'Location 1' }])); // locations
      mockDb.select.mockReturnValueOnce(chain([{ name: 'Custom Status' }])); // customStatuses
      mockDb.select.mockReturnValueOnce(chain([{ name: 'Laptops', pillar: 'Hardware' }])); // categories
      mockDb.select.mockReturnValueOnce(chain([{ companyName: 'Vendor 1' }])); // vendors

      const result = await getStandardReportsFilterOptions();
      expect(result.locations).toContain('Location 1');
      expect(result.statuses).toContain('Custom Status');
      expect(result.categories[0].name).toBe('Laptops');
    });
  });

  describe('fetchReportPreview', () => {
    it('throws unauthorized for unauthenticated user', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(null);
      await expect(fetchReportPreview({})).rejects.toThrow('Unauthorized');
    });

    it('throws forbidden for employee', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
      await expect(fetchReportPreview({})).rejects.toThrow('Forbidden');
    });

    it('throws validation error for invalid source', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
      await expect(fetchReportPreview({ source: 123 as any })).rejects.toThrow(/Expected string|Invalid report filters|Failed to fetch/);
    });

    it('handles Master Data report source', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
      mockDb.select.mockReturnValue(chain([
        { id: 1, name: 'Category 1', categoryCode: 'CAT-01', isActive: true }
      ]));

      const result = await fetchReportPreview({
        source: 'Master Data',
        masterDataType: 'asset-categories',
        page: 1,
        pageSize: 10,
      });

      expect(result.data.length).toBe(1);
      expect(result.data[0]['Type']).toBe('Category');
      expect(result.data[0]['Name']).toBe('Category 1');
    });

    it('handles Active Assignments report source', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
      
      const mockChain = chain([{ 
        id: 1, 
        assetTag: 'TAG-123', 
        assetName: 'Asset 1', 
        assignedTo: 'User 1',
        assignedBy: 'Admin',
        assignedDate: new Date().toISOString(),
      }]);
      mockDb.select.mockReturnValue(mockChain);

      const result = await fetchReportPreview({
        source: 'Active Assignments',
        page: 1,
        pageSize: 10,
      });

      expect(result.data.length).toBe(1);
      expect(result.data[0]['Asset Tag']).toBe('TAG-123');
    });
  });
});
