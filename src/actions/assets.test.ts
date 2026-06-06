import { describe, it, expect, vi, beforeEach } from 'vitest';
import { revalidatePath } from 'next/cache';
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
    ['values', 'set', 'where', 'returning'].forEach(
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
    delete: vi.fn().mockReturnValue(chain([])),
    query: {
      models: { findFirst: vi.fn() },
      assets: { findFirst: vi.fn() },
    },
    transaction: vi.fn((cb) => cb(db)),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([{ value: 0 }]),
  };
  return { mockDb: db, chain };
});

vi.mock('@/db', () => ({ db: mockDb }));

vi.mock('@/db/schema', () => ({
  assets: { id: 'assets.id', assetTag: 'assets.assetTag' },
  assetPurchases: { id: 'assetPurchases.id', assetId: 'assetPurchases.assetId' },
  softwareLicenses: { id: 'softwareLicenses.id' },
  models: { id: 'models.id' },
  assetAssignments: { assetId: 'assetAssignments.assetId', returnedDate: 'assetAssignments.returnedDate' },
}));

const mockLogAuditAction = vi.fn().mockResolvedValue(undefined);
const mockLogAuditActionTx = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/audit', () => ({
  logAuditAction: (...args: unknown[]) => mockLogAuditAction(...args),
  logAuditActionTx: (...args: unknown[]) => mockLogAuditActionTx(...args),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const mockDispatchWebhookEvent = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/webhooks/dispatcher', () => ({
  dispatchWebhookEvent: (...args: unknown[]) => mockDispatchWebhookEvent(...args),
}));

vi.mock('@/lib/currency', () => ({
  fetchLiveExchangeRates: vi.fn().mockResolvedValue({}),
  convertCurrencyAmount: vi.fn().mockReturnValue(100),
}));

vi.mock('@/actions/statuses', () => ({
  getManualOverrideStatuses: vi.fn().mockResolvedValue([
    { value: 'Available', label: 'Available' },
    { value: 'Lost', label: 'Lost' },
    { value: 'Defective', label: 'Defective' },
    { value: 'Retired', label: 'Retired' },
  ]),
}));

vi.mock('@/lib/data/asset-details-repo', () => ({
  getAssetDetailsById: vi.fn().mockResolvedValue({ id: '1', name: 'Asset' }),
  getAssetHistoryById: vi.fn().mockResolvedValue([]),
  getAssetMaintenanceById: vi.fn().mockResolvedValue([]),
}));

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------

import {
  registerAsset,
  getAssetDetails,
  getAssetHistory,
  getAssetMaintenance,
  updateAsset,
  manualStatusOverrideAction,
  editAssetDetailsAction,
} from '@/actions/assets';

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

const validHardwarePayload = {
  pillar: 'Hardware',
  name: 'Dell XPS 15',
  categoryId: '1',
  brandId: '1',
  modelId: '1',
  vendorId: '1',
  purchaseDate: '2023-01-01',
  basePrice: '1500',
  currencyCode: 'USD',
  serialNumber: 'SN-12345',
};

const validSoftwarePayload = {
  pillar: 'Software',
  name: 'Adobe Creative Cloud',
  categoryId: '2',
  brandId: '2',
  modelId: '2',
  vendorId: '2',
  purchaseDate: '2023-01-01',
  basePrice: '600',
  currencyCode: 'USD',
  licenseType: 'Subscription',
  totalSeats: '10',
  serialNumber: 'LIC-98765',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('registerAsset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws unauthorized for unauthenticated user', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    const result = await registerAsset({ success: false }, formData(validHardwarePayload));
    expect(result.success).toBe(false);
    expect(result.message).toContain('sign in');
  });

  it('throws unauthorized for Employee role', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    const result = await registerAsset({ success: false }, formData(validHardwarePayload));
    expect(result.success).toBe(false);
    expect(result.message).toContain('Forbidden');
  });

  it('rejects invalid input payload (Zod validation)', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    // Missing required fields like basePrice, name, etc.
    const result = await registerAsset({ success: false }, formData({ pillar: 'Hardware' }));
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
  });

  it('successfully inserts a hardware asset and audits it', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(IT_OPERATOR_USER);
    
    mockDb.query.models.findFirst.mockResolvedValue({
      id: 1,
      category: { prefix: 'LPT' }
    });

    mockDb.where.mockResolvedValue([{ value: 0 }]); // Next sequence = 1
    mockDb.insert.mockReturnValue(chain([{ id: 'a1', assetTag: 'LPT-001' }]));

    const result = await registerAsset({ success: false }, formData(validHardwarePayload));
    expect(result.success).toBe(true);
    expect(result.assetId).toBe('LPT-001');

    expect(mockLogAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'CREATE',
        entityId: 'a1',
      })
    );
    expect(mockDispatchWebhookEvent).toHaveBeenCalledWith(
      'asset.created',
      expect.objectContaining({ assetTag: 'LPT-001' })
    );
    expect(revalidatePath).toHaveBeenCalledWith('/assets');
  });

  it('successfully inserts a software asset with license data', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    
    mockDb.query.models.findFirst.mockResolvedValue({
      id: 2,
      category: { prefix: 'SFW' }
    });

    mockDb.where.mockResolvedValue([{ value: 0 }]);
    mockDb.insert.mockReturnValue(chain([{ id: 's1', assetTag: 'SFW-001' }]));

    const result = await registerAsset({ success: false }, formData(validSoftwarePayload));
    expect(result.success).toBe(true);
    expect(result.assetId).toBe('SFW-001');
    expect(mockDb.insert).toHaveBeenCalledTimes(3); // assets, assetPurchases, softwareLicenses
    expect(revalidatePath).toHaveBeenCalledWith('/assets');
  });

  it('rolls back transaction on DB failure', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    
    mockDb.query.models.findFirst.mockResolvedValue({
      id: 1,
      category: { prefix: 'LPT' }
    });

    mockDb.transaction.mockRejectedValue(new Error('DB Error'));

    const result = await registerAsset({ success: false }, formData(validHardwarePayload));
    expect(result.success).toBe(false);
    expect(result.message).toContain('Unexpected error');
  });
});

describe('getAssetDetails, getAssetHistory, getAssetMaintenance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAssetDetails delegates to repo for authorized users', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const result = await getAssetDetails('00000000-0000-4000-a000-000000000000');
    expect(result).toBeDefined();
  });

  it('getAssetHistory throws unauthorized for employee', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    await expect(getAssetHistory('00000000-0000-4000-a000-000000000000')).rejects.toThrow('Unauthorized');
  });

  it('getAssetMaintenance throws unauthorized for unauthenticated', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    await expect(getAssetMaintenance('00000000-0000-4000-a000-000000000000')).rejects.toThrow('Unauthorized');
  });
});

describe('updateAsset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws unauthorized for Employee', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    await expect(updateAsset('00000000-0000-4000-a000-000000000000', { status: 'Available' })).rejects.toThrow('Forbidden');
  });

  it('rejects updates on disposed assets (Disposed guard)', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.query.assets.findFirst.mockResolvedValue({ id: '00000000-0000-4000-a000-000000000000', status: 'Disposed' });
    
    await expect(updateAsset('00000000-0000-4000-a000-000000000000', { condition: 'Fair' })).rejects.toThrow('Disposed assets cannot be edited');
  });

  it('successfully updates allowed fields and logs audit', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.query.assets.findFirst.mockResolvedValue({ id: '00000000-0000-4000-a000-000000000000', status: 'Available', assetTag: 'TAG-1' });
    mockDb.update.mockReturnValue(chain([{ id: '00000000-0000-4000-a000-000000000000' }]));

    const result = await updateAsset('00000000-0000-4000-a000-000000000000', { status: 'Assigned', condition: 'Excellent' });
    expect(result).toBeDefined();

    expect(mockLogAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: 'UPDATE', entityId: '00000000-0000-4000-a000-000000000000' })
    );
    expect(mockDispatchWebhookEvent).toHaveBeenCalledWith(
      'asset.status_changed',
      expect.objectContaining({ oldStatus: 'Available', newStatus: 'Assigned' })
    );
    expect(revalidatePath).toHaveBeenCalledWith('/assets');
  });
});

describe('manualStatusOverrideAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws unauthorized for non-admin/operator', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(IT_OPERATOR_USER); // Only GlobalAdmin can override manually
    const result = await manualStatusOverrideAction('00000000-0000-4000-a000-000000000000', 'Lost', 'reasoning here');
    expect(result.success).toBe(false);
    expect(result.message).toContain('Forbidden');
  });

  it('successfully changes status and logs reasonNote', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.query.assets.findFirst.mockResolvedValue({
      id: '00000000-0000-4000-a000-000000000000',
      status: 'Available',
      model: { category: { pillar: 'Hardware' } }
    });
    mockDb.transaction.mockImplementation(async (cb) => { await cb(mockDb); });

    const result = await manualStatusOverrideAction('00000000-0000-4000-a000-000000000000', 'Lost', 'Asset was reported missing today');
    expect(result.success).toBe(true);

    expect(mockLogAuditActionTx).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        actionType: 'STATUS_CHANGE',
        newData: expect.objectContaining({ status: 'Lost', reason: 'Asset was reported missing today' })
      })
    );

    expect(revalidatePath).toHaveBeenCalledWith('/assets');
    expect(revalidatePath).toHaveBeenCalledWith('/assets/hardware');
    expect(revalidatePath).toHaveBeenCalledWith('/assets/software');
    expect(revalidatePath).toHaveBeenCalledWith('/assets/furniture');
    expect(revalidatePath).toHaveBeenCalledWith('/assets/office-electronics');
  });

  it('rejects status change for software assets (Software rejection)', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.query.assets.findFirst.mockResolvedValue({
      id: '00000000-0000-4000-a000-000000000000',
      status: 'Available',
      model: { category: { pillar: 'Software' } }
    });

    const result = await manualStatusOverrideAction('00000000-0000-4000-a000-000000000000', 'Lost', 'reasoning here');
    expect(result.success).toBe(false);
    expect(result.message).toContain('Software asset status');
  });

  it('rejects status change if asset is already Disposed', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.query.assets.findFirst.mockResolvedValue({
      id: '00000000-0000-4000-a000-000000000000',
      status: 'Disposed',
      model: { category: { pillar: 'Hardware' } }
    });

    const result = await manualStatusOverrideAction('00000000-0000-4000-a000-000000000000', 'Lost', 'reasoning here');
    expect(result.success).toBe(false);
    expect(result.message).toContain('cannot have their status changed');
  });

  it('validates reasonNote length (min 10 chars)', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const result = await manualStatusOverrideAction('00000000-0000-4000-a000-000000000000', 'Lost', 'short');
    expect(result.success).toBe(false);
    expect(result.message).toContain('least 10 character');
  });
});

describe('editAssetDetailsAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws unauthorized for unauthenticated user', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    const result = await editAssetDetailsAction('00000000-0000-4000-a000-000000000000', { name: 'New Name' });
    expect(result.success).toBe(false);
  });

  it('rejects updates containing unknown keys', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.query.assets.findFirst.mockResolvedValue({
      id: '00000000-0000-4000-a000-000000000000',
      status: 'Available',
      instanceAttributes: { knownKey: 'value' }
    });

    const result = await editAssetDetailsAction('00000000-0000-4000-a000-000000000000', { instanceAttributes: { unknownKey: 'value' } });
    expect(result.success).toBe(false);
    expect(result.message).toContain('Unknown instance attribute keys');
  });

  it('detects no-change and skips DB update (returns success early)', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.query.assets.findFirst.mockResolvedValue({ id: '00000000-0000-4000-a000-000000000000', status: 'Available' });

    const result = await editAssetDetailsAction('00000000-0000-4000-a000-000000000000', {});
    expect(result.success).toBe(true);
    expect(result.message).toContain('No changes detected');
  });

  it('updates valid fields, logs diff in audit', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.query.assets.findFirst.mockResolvedValue({
      id: '00000000-0000-4000-a000-000000000000',
      status: 'Available',
      name: 'Old Name'
    });
    mockDb.transaction.mockImplementation(async (cb) => { await cb(mockDb); });
    mockDb.update.mockReturnValue(chain([{ id: '00000000-0000-4000-a000-000000000000' }]));

    const result = await editAssetDetailsAction('00000000-0000-4000-a000-000000000000', { name: 'New Name' });
    expect(result.success).toBe(true);
    
    expect(mockLogAuditActionTx).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        actionType: 'UPDATE',
        newData: expect.objectContaining({ name: 'New Name' })
      })
    );
  });
});
