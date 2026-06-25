import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ADMIN_USER, EMPLOYEE_USER, IT_OPERATOR_USER } from '@/test/fixtures/users';
import {
  getAuditLogs,
  getAssetAuditHistory,
  getAllAssetAuditHistory,
  resolveTargetEntityLabels,
  resolveAuditValueLabels
} from '@/actions/audit-log';

const mockGetAuthenticatedUser = vi.fn();
vi.mock('@/actions/auth', () => ({
  getAuthenticatedUser: () => mockGetAuthenticatedUser(),
  enforceActionAccess: vi.fn(async (validator) => {
    const user = await mockGetAuthenticatedUser();
    if (!user) throw new Error('Unauthorized');
    if (validator && !validator(user)) throw new Error('Forbidden');
  }),
}));

const { mockDb, chain } = vi.hoisted(() => {
  const chain = (resolvedValue: unknown = []) => {
    const c: Record<string, ReturnType<typeof vi.fn>> = {};
    ['values', 'set', 'where', 'returning', 'limit', 'offset', 'innerJoin', 'leftJoin', 'orderBy', 'from', 'groupBy'].forEach(
      (m) => (c[m] = vi.fn().mockReturnThis())
    );
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
    insert: vi.fn().mockReturnValue(chain([])),
    update: vi.fn().mockReturnValue(chain([])),
    select: vi.fn().mockReturnValue(chain([])),
  };
  return { mockDb: db, chain };
});

vi.mock('@/db', () => ({ db: mockDb }));
vi.mock('@/db/schema', () => ({
  systemAuditLogs: {
    id: 'systemAuditLogs.id',
    actionType: 'systemAuditLogs.actionType',
    entityType: 'systemAuditLogs.entityType',
    entityId: 'systemAuditLogs.entityId',
    ipAddress: 'systemAuditLogs.ipAddress',
    oldValue: 'systemAuditLogs.oldValue',
    newValue: 'systemAuditLogs.newValue',
    performedAt: 'systemAuditLogs.performedAt',
    performedById: 'systemAuditLogs.performedById',
  },
  assets: { id: 'assets.id', assetTag: 'assets.assetTag', name: 'assets.name' },
  users: { id: 'users.id', name: 'users.name', email: 'users.email', isActive: 'users.isActive' },
  locations: { id: 'locations.id', locationCode: 'locations.locationCode', name: 'locations.name' },
  categories: { id: 'categories.id', categoryCode: 'categories.categoryCode', name: 'categories.name' },
  brands: { id: 'brands.id', brandCode: 'brands.brandCode', name: 'brands.name' },
  models: { id: 'models.id', modelCode: 'models.modelCode', name: 'models.name' },
  vendors: { id: 'vendors.id', vendorCode: 'vendors.vendorCode', companyName: 'vendors.companyName' },
  owners: { id: 'owners.id', ownerCode: 'owners.ownerCode', companyName: 'owners.companyName' },
  departments: { id: 'departments.id', departmentCode: 'departments.departmentCode', name: 'departments.name' },
  reportTemplates: { id: 'reportTemplates.id', reportCode: 'reportTemplates.reportCode', name: 'reportTemplates.name' },
}));

vi.mock('@/lib/latency', () => ({
  startLatencyTimer: vi.fn().mockReturnValue(0),
  logLatency: vi.fn(),
  logError: vi.fn(),
}));

describe('audit-log server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('resolveAuditValueLabels', () => {
    it('throws error for unauthorized users', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
      await expect(resolveAuditValueLabels([])).rejects.toThrow('Unauthorized access to audit metadata.');
    });

    it('resolves labels successfully for admin', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
      // Ensure we hit the database with correct entities
      const records = [
        { oldValue: { assetId: 'uuid-1', locationId: 1 }, newValue: { assetId: 'uuid-2', locationId: 2 } }
      ];
      
      // We must provide mocks for the Promise.all array (9 items: assets, users, locations, categories, brands, models, vendors, owners, departments)
      // Since our records only use assetId and locationId, the logic will only await db.select() for Asset and locations.
      // But because it maps over all collectedIds conditionally:
      // It executes up to 9 queries, some Promise.resolve([]).
      // mockDb.select is called 2 times.
      mockDb.select.mockReturnValueOnce(chain([{ id: 'uuid-1', assetTag: 'TAG1', name: 'Asset1' }, { id: 'uuid-2', assetTag: 'TAG2', name: 'Asset2' }])); // assets
      mockDb.select.mockReturnValueOnce(chain([{ id: 1, code: 'LOC1', name: 'Location1' }, { id: 2, code: 'LOC2', name: 'Location2' }])); // locations
      
      const { labels, idMappings } = await resolveAuditValueLabels(records);
      
      expect(labels.get('Asset::uuid-1')).toBe('TAG1 · Asset1');
      expect(labels.get('locations::1')).toBe('LOC1 · Location1');
      expect(idMappings['assetId']).toBe('Asset');
      expect(idMappings['locationId']).toBe('locations');
    });
  });

  describe('resolveTargetEntityLabels', () => {
    it('resolves labels grouping by entityType', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
      const records = [
        { entityType: 'Asset', entityId: 'uuid-1' },
        { entityType: 'users', entityId: 'user-1' }
      ];
      
      mockDb.select.mockReturnValueOnce(chain([{ id: 'uuid-1', assetTag: 'TAG1', name: 'Asset1' }])); // assets
      mockDb.select.mockReturnValueOnce(chain([{ id: 'user-1', name: 'John Doe', email: 'john@example.com' }])); // users
      
      const labels = await resolveTargetEntityLabels(records);
      
      expect(labels.get('Asset::uuid-1')).toBe('TAG1 · Asset1');
      expect(labels.get('users::user-1')).toBe('John Doe <john@example.com>');
    });
  });

  describe('getAuditLogs', () => {
    it('throws error for unauthorized users', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(IT_OPERATOR_USER); // Operators can't view global audit
      await expect(getAuditLogs({ page: 1, pageSize: 10 })).rejects.toThrow('Failed to fetch audit logs.');
    });

    it('returns paginated data', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
      
      // First query is count
      mockDb.select.mockReturnValueOnce(chain([{ total: 1 }]));
      
      // Second query is records
      mockDb.select.mockReturnValueOnce(chain([{
        id: 1,
        performedAt: new Date(),
        entityType: 'Asset',
        entityId: 'uuid-1',
        actionType: 'CREATE',
        oldValue: null,
        newValue: null,
        ipAddress: '127.0.0.1',
        performedById: 'admin-id',
        performedByName: 'Admin',
        performedByEmail: 'admin@example.com',
        performedByRole: 'GlobalAdmin'
      }]));

      // Third: resolveTargetEntityLabels
      mockDb.select.mockReturnValueOnce(chain([{ id: 'uuid-1', assetTag: 'TAG1', name: 'Asset1' }]));

      // Fourth: resolveAuditValueLabels
      // it has no oldValue/newValue, so 0 DB calls from resolveAuditValueLabels

      const result = await getAuditLogs({ page: 1, pageSize: 10, search: 'test', filters: [{ field: 'Action Taken', operator: 'is', value: 'CREATE' }] });
      
      expect(result.data.length).toBe(1);
      expect(result.meta.total).toBe(1);
      expect(result.data[0].entityLabel).toBe('TAG1 · Asset1');
    });
  });

  describe('getAssetAuditHistory', () => {
    it('throws error for unauthorized users', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
      await expect(getAssetAuditHistory('uuid-1', 1, 10)).rejects.toThrow('Failed to fetch asset history.');
    });

    it('returns history with hasMore flag', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
      
      // Records query (limit is size + 1 to check hasMore)
      mockDb.select.mockReturnValueOnce(chain([
        { id: 1, entityType: 'Asset', entityId: 'uuid-1', oldValue: null, newValue: null },
        { id: 2, entityType: 'Asset', entityId: 'uuid-1', oldValue: null, newValue: null }
      ]));

      // Labels query
      mockDb.select.mockReturnValueOnce(chain([{ id: 'uuid-1', assetTag: 'TAG1', name: 'Asset1' }]));
      
      const result = await getAssetAuditHistory('uuid-1', 1, 1);
      expect(result.hasMore).toBe(true);
      expect(result.data.length).toBe(1);
    });
  });

  describe('getAllAssetAuditHistory', () => {
    it('returns full history', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
      
      mockDb.select.mockReturnValueOnce(chain([
        { id: 1, entityType: 'Asset', entityId: 'uuid-1', oldValue: null, newValue: null }
      ]));
      mockDb.select.mockReturnValueOnce(chain([{ id: 'uuid-1', assetTag: 'TAG1', name: 'Asset1' }]));
      
      const result = await getAllAssetAuditHistory('uuid-1');
      expect(result.length).toBe(1);
    });
  });
});
