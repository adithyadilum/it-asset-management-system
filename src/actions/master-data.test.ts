import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ADMIN_USER, EMPLOYEE_USER, IT_OPERATOR_USER } from '@/test/fixtures/users';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockGetAuthenticatedUser = vi.fn();
vi.mock('@/actions/auth', () => ({
  getAuthenticatedUser: () => mockGetAuthenticatedUser(),
}));

const { mockDb, chain } = vi.hoisted(() => {
  const chain = (resolvedValue: unknown = []) => {
    const c: Record<string, ReturnType<typeof vi.fn>> = {};
    [
      'select', 'from', 'where', 'innerJoin', 'leftJoin',
      'set', 'limit', 'returning', 'values', 'delete',
      'insert', 'update', 'orderBy', 'groupBy',
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

  return {
    mockDb: {
      select: vi.fn().mockReturnValue(chain([])),
      insert: vi.fn().mockReturnValue(chain([])),
      update: vi.fn().mockReturnValue(chain([])),
      delete: vi.fn().mockReturnValue(chain([])),
      query: {
        users: { findFirst: vi.fn(), findMany: vi.fn() },
      },
    },
    chain,
  };
});

vi.mock('@/db', () => ({ db: mockDb }));

vi.mock('@/db/schema', () => ({
  assets: { id: 'assets.id', locationId: 'assets.locationId', modelId: 'assets.modelId', ownerId: 'assets.ownerId' },
  assetPurchases: { id: 'assetPurchases.id', assetId: 'assetPurchases.assetId', vendorId: 'assetPurchases.vendorId' },
  assetAssignments: { id: 'assetAssignments.id', assignedToLocationId: 'assetAssignments.assignedToLocationId' },
  brands: { id: 'brands.id', name: 'brands.name', isActive: 'brands.isActive' },
  categories: { id: 'categories.id', pillar: 'c.pillar', name: 'c.name', prefix: 'c.prefix', customSchema: 'c.cs', requiresSerial: 'c.rs', categoryCode: 'c.code', isActive: 'c.isActive' },
  departments: { id: 'departments.id', name: 'departments.name' },
  locations: { id: 'locations.id', name: 'locations.name', locationCode: 'l.code', parentId: 'l.parentId', type: 'l.type', isActive: 'l.isActive' },
  models: { id: 'models.id', brandId: 'models.brandId', categoryId: 'models.categoryId' },
  owners: { id: 'owners.id' },
  vendors: { id: 'vendors.id', companyName: 'vendors.companyName' },
  customStatuses: { id: 'customStatuses.id' },
  maintenanceTickets: { id: 'maintenanceTickets.id', vendorName: 'mt.vendorName' },
  users: { id: 'users.id', departmentId: 'u.departmentId' },
}));

const mockLogAuditAction = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/audit', () => ({
  logAuditAction: (...args: unknown[]) => mockLogAuditAction(...args),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/latency', () => ({
  startLatencyTimer: () => Date.now(),
  logLatency: vi.fn(),
  logError: vi.fn(),
}));

vi.mock('@/lib/storage', () => ({
  uploadFileToStorage: vi.fn().mockResolvedValue('https://storage.example.com/test.png'),
}));

vi.mock('@/lib/master-data/shared', () => ({
  MASTER_DATA_RECORD_ENTITIES: [
    'locations', 'asset-categories', 'brands', 'device-models',
    'vendors', 'owners', 'departments', 'statuses',
  ],
}));

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------

import {
  deleteMasterDataRecords,
  createBrand,
  createCategory,
} from '@/actions/master-data';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    fd.set(key, value);
  }
  return fd;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('deleteMasterDataRecords', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no linked entities
    mockDb.select.mockReturnValue(chain([{ count: 0 }]));
  });

  it('returns unauthorized for unauthenticated user', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    const result = await deleteMasterDataRecords('brands', [1]);
    expect(result.success).toBe(false);
    expect(result.message).toContain('Forbidden');
  });

  it('returns unauthorized for non-admin user', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    const result = await deleteMasterDataRecords('brands', [1]);
    expect(result.success).toBe(false);
    expect(result.message).toContain('Forbidden');
  });

  it('returns unauthorized for ITOperator', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(IT_OPERATOR_USER);
    const result = await deleteMasterDataRecords('brands', [1]);
    expect(result.success).toBe(false);
    expect(result.message).toContain('Forbidden');
  });

  it('returns error for invalid entity type', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const result = await deleteMasterDataRecords('invalid-entity', [1]);
    expect(result.success).toBe(false);
    expect(result.message).toContain('Invalid record type');
  });

  it('returns error for empty valid ID list', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const result = await deleteMasterDataRecords('brands', []);
    expect(result.success).toBe(false);
    expect(result.message).toContain('No valid records');
  });

  it('filters out non-positive and non-integer IDs', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const result = await deleteMasterDataRecords('brands', [0, -1, 0.5]);
    expect(result.success).toBe(false);
    expect(result.message).toContain('No valid records');
  });

  it('blocks deletion when linked assets exist', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.select.mockReturnValue(chain([{ count: 3 }]));

    const result = await deleteMasterDataRecords('locations', [1, 2]);
    expect(result.success).toBe(false);
    expect(result.message).toContain('linked assets');
  });

  it('shows singular message for 1 linked asset', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.select.mockReturnValue(chain([{ count: 1 }]));

    const result = await deleteMasterDataRecords('brands', [1]);
    expect(result.success).toBe(false);
    expect(result.message).toContain('1 linked asset');
  });

  it('successfully deletes unlinked records and logs audit', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    // No linked entities
    mockDb.select.mockReturnValue(chain([{ count: 0 }]));
    // Successful deletion
    mockDb.delete.mockReturnValue(chain([{ id: 1 }, { id: 2 }]));

    const result = await deleteMasterDataRecords('brands', [1, 2]);
    expect(result.success).toBe(true);
    expect(result.message).toContain('2 records deleted');
    expect(mockLogAuditAction).toHaveBeenCalledTimes(2);
  });

  it('returns singular message for 1 deleted record', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.select.mockReturnValue(chain([{ count: 0 }]));
    mockDb.delete.mockReturnValue(chain([{ id: 1 }]));

    const result = await deleteMasterDataRecords('brands', [1]);
    expect(result.success).toBe(true);
    expect(result.message).toBe('Record deleted successfully.');
  });

  it('logs audit with correct entity type and performer', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.select.mockReturnValue(chain([{ count: 0 }]));
    mockDb.delete.mockReturnValue(chain([{ id: 42 }]));

    await deleteMasterDataRecords('vendors', [42]);
    expect(mockLogAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'vendors',
        entityId: '42',
        actionType: 'DELETE',
        performedById: ADMIN_USER.id,
      })
    );
  });

  it('deduplicates record IDs', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.select.mockReturnValue(chain([{ count: 0 }]));
    mockDb.delete.mockReturnValue(chain([{ id: 1 }]));

    const result = await deleteMasterDataRecords('brands', [1, 1, 1]);
    expect(result.success).toBe(true);
  });

  it('returns error when no records were actually deleted', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.select.mockReturnValue(chain([{ count: 0 }]));
    mockDb.delete.mockReturnValue(chain([])); // 0 rows deleted

    const result = await deleteMasterDataRecords('brands', [999]);
    expect(result.success).toBe(false);
    expect(result.message).toContain('No records were deleted');
  });

  it('handles database error gracefully', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    // First select (linked check) succeeds
    mockDb.select.mockReturnValue(chain([{ count: 0 }]));
    // Delete throws
    mockDb.delete.mockImplementation(() => {
      throw new Error('FK violation');
    });

    const result = await deleteMasterDataRecords('brands', [1]);
    expect(result.success).toBe(false);
    expect(result.message).toContain('referenced by existing data');
  });
});

describe('createBrand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns unauthorized for non-admin', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    const result = await createBrand({ success: false, message: '' }, formData({ name: 'HP', isActive: 'true' }));
    expect(result.success).toBe(false);
    expect(result.message).toContain('Forbidden');
  });

  it('returns validation error for invalid data (name too short)', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const result = await createBrand({ success: false, message: '' }, formData({ name: 'A', isActive: 'true' }));
    expect(result.success).toBe(false);
    expect(result.message).toContain('validate brand data');
    expect(result.errors).toBeDefined();
  });

  it('successfully inserts and audits brand', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.insert.mockReturnValue(chain([{ id: 1, name: 'HP', isActive: true }]));

    const result = await createBrand(
      { success: false, message: '' },
      formData({ name: 'HP', isActive: 'true' })
    );
    expect(result.success).toBe(true);
    expect(result.message).toContain('created successfully');
    expect(mockLogAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'brands',
        actionType: 'CREATE',
        performedById: ADMIN_USER.id,
      })
    );
  });

  it('returns error for database failure (e.g. duplicate name)', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.insert.mockImplementation(() => {
      throw new Error('unique_violation');
    });

    const result = await createBrand(
      { success: false, message: '' },
      formData({ name: 'DuplicateBrand', isActive: 'true' })
    );
    expect(result.success).toBe(false);
    expect(result.message).toContain('may already exist');
  });
});

describe('createCategory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns unauthorized for non-admin', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    const result = await createCategory(
      { success: false, message: '' },
      formData({
        pillar: 'IT & Digital',
        name: 'Laptops',
        prefix: 'LAP',
        customSchema: '{"modelSpecs":[],"assetTracking":[]}',
      })
    );
    expect(result.success).toBe(false);
    expect(result.message).toContain('Forbidden');
  });

  it('returns validation error for invalid prefix', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const result = await createCategory(
      { success: false, message: '' },
      formData({
        pillar: 'IT & Digital',
        name: 'Laptops',
        prefix: 'XX', // Too short
        customSchema: '{"modelSpecs":[],"assetTracking":[]}',
      })
    );
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
  });

  it('successfully creates category with audit log', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.insert.mockReturnValue(
      chain([{ id: 1, pillar: 'IT & Digital', name: 'Laptops', prefix: 'LAP', customSchema: {}, requiresSerial: true }])
    );

    const result = await createCategory(
      { success: false, message: '' },
      formData({
        pillar: 'IT & Digital',
        name: 'Laptops',
        prefix: 'LAP',
        customSchema: '{"modelSpecs":[],"assetTracking":[]}',
      })
    );
    expect(result.success).toBe(true);
    expect(mockLogAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'asset-categories',
        actionType: 'CREATE',
      })
    );
  });

  it('returns error for invalid pillar value', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const result = await createCategory(
      { success: false, message: '' },
      formData({
        pillar: 'InvalidPillar',
        name: 'Laptops',
        prefix: 'LAP',
        customSchema: '{"modelSpecs":[],"assetTracking":[]}',
      })
    );
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
  });

  it('handles database error (e.g. duplicate prefix)', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.insert.mockImplementation(() => {
      throw new Error('unique_violation');
    });

    const result = await createCategory(
      { success: false, message: '' },
      formData({
        pillar: 'IT & Digital',
        name: 'Laptops',
        prefix: 'LAP',
        customSchema: '{"modelSpecs":[],"assetTracking":[]}',
      })
    );
    expect(result.success).toBe(false);
    expect(result.message).toContain('may already exist');
  });
});
