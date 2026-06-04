import { describe, it, expect, vi, beforeEach } from 'vitest';
import { revalidatePath } from 'next/cache';
import { ADMIN_USER, EMPLOYEE_USER, IT_OPERATOR_USER } from '@/test/fixtures/users';
import type { DisposalFormState } from '@/types/disposals';

const mockGetAuthenticatedUser = vi.fn();
vi.mock('@/actions/auth', () => ({
  getAuthenticatedUser: () => mockGetAuthenticatedUser(),
}));

const { mockDb, chain } = vi.hoisted(() => {
  const chain = (resolvedValue: unknown = []) => {
    const c: Record<string, ReturnType<typeof vi.fn>> = {};
    ['values', 'set', 'where', 'returning', 'limit', 'offset', 'innerJoin', 'leftJoin', 'orderBy', 'from'].forEach(
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
    transaction: vi.fn(async (cb) => {
      try {
        return await cb(db);
      } catch (e) {
        throw e;
      }
    }),
  };
  return { mockDb: db, chain };
});

vi.mock('@/db', () => ({ db: mockDb }));
vi.mock('@/db/schema', () => ({
  assetDisposals: { id: 'assetDisposals.id', assetId: 'assetDisposals.assetId', status: 'assetDisposals.status' },
  assetPurchases: { id: 'assetPurchases.id', assetId: 'assetPurchases.assetId' },
  assets: { id: 'assets.id', assetTag: 'assets.assetTag', status: 'assets.status', isArchived: 'assets.isArchived' },
  users: { id: 'users.id' },
  models: { id: 'models.id' },
  categories: { id: 'categories.id' },
  brands: { id: 'brands.id' },
  systemAuditLogs: { id: 'systemAuditLogs.id' },
  maintenanceTickets: { id: 'maintenanceTickets.id' },
  assetDocuments: { id: 'assetDocuments.id' },
  assetAssignments: { assetId: 'assetAssignments.assetId', returnedDate: 'assetAssignments.returnedDate' },
}));

const mockDispatchWebhookEvent = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/webhooks/dispatcher', () => ({
  dispatchWebhookEvent: (...args: unknown[]) => mockDispatchWebhookEvent(...args),
}));

const mockUploadFileToStorage = vi.fn().mockResolvedValue('https://storage.example.com/receipt.pdf');
vi.mock('@/lib/storage', () => ({
  uploadFileToStorage: (...args: unknown[]) => mockUploadFileToStorage(...args),
}));

vi.mock('@/actions/asset-financial-vitals', () => ({
  getAssetFinancialVitals: vi.fn().mockResolvedValue({ currentBookValue: 100 }),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/latency', () => ({
  startLatencyTimer: vi.fn().mockReturnValue(0),
  logLatency: vi.fn(),
  logError: vi.fn(),
}));

import {
  getDisposalReviewDetails,
  createBulkDisposalRequests,
  rejectDisposalRequest,
  uploadDisposalReceipt,
  executeAssetDisposal,
} from '@/actions/disposals';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('getDisposalReviewDetails', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws UNAUTHENTICATED when user is not logged in', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    await expect(getDisposalReviewDetails(1)).rejects.toThrow('UNAUTHENTICATED');
  });

  it('throws FORBIDDEN for Employee', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    await expect(getDisposalReviewDetails(1)).rejects.toThrow('FORBIDDEN');
  });

  it('throws FORBIDDEN for ITOperator', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(IT_OPERATOR_USER);
    await expect(getDisposalReviewDetails(1)).rejects.toThrow('FORBIDDEN');
  });

  it('throws for invalid disposalId', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    await expect(getDisposalReviewDetails(-1)).rejects.toThrow('Invalid disposal id');
  });

  it('throws when disposal request not found', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.select.mockReturnValueOnce(chain([]));
    await expect(getDisposalReviewDetails(1)).rejects.toThrow('Disposal request not found');
  });

  it('returns valid details for admin', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const mockRow = {
      disposalId: 1,
      assetId: VALID_UUID,
      assetTag: 'TAG',
      assetName: 'Asset',
      requestedBy: 'User',
      requestedAt: new Date(),
      reason: 'Old',
      createdAt: new Date(),
    };
    mockDb.select.mockReturnValueOnce(chain([mockRow]));
    
    const result = await getDisposalReviewDetails(1);
    expect(result.disposalId).toBe(1);
    expect(result.assetId).toBe(VALID_UUID);
  });
});

describe('createBulkDisposalRequests', () => {
  const validInput = { assetIds: [VALID_UUID], reason: 'EOL' };
  
  beforeEach(() => vi.clearAllMocks());

  it('throws UNAUTHENTICATED when user is not logged in', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    await expect(createBulkDisposalRequests(validInput)).rejects.toThrow('UNAUTHENTICATED');
  });

  it('throws FORBIDDEN for Employee', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    await expect(createBulkDisposalRequests(validInput)).rejects.toThrow('FORBIDDEN');
  });

  it('allows ITOperator to create request', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(IT_OPERATOR_USER);
    mockDb.select.mockReturnValueOnce(chain([])); // no existing
    mockDb.insert.mockReturnValue(chain([{ id: 1, assetId: VALID_UUID }]));
    mockDb.update.mockReturnValue(chain([{ id: VALID_UUID }]));
    
    const result = await createBulkDisposalRequests(validInput);
    expect(result.success).toBe(true);
  });

  it('throws if no valid asset ids', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    await expect(createBulkDisposalRequests({ ...validInput, assetIds: [] })).rejects.toThrow('Select at least one asset');
  });

  it('skips existing pending requests and throws if all are pending', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.select.mockReturnValueOnce(chain([{ assetId: VALID_UUID }])); // existing
    
    await expect(createBulkDisposalRequests(validInput)).rejects.toThrow('All selected assets already have a pending disposal request');
  });

  it('inserts disposals, updates asset status, logs audit, and dispatches webhook', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.select.mockReturnValueOnce(chain([])); // no existing
    mockDb.insert.mockReturnValue(chain([{ id: 1, assetId: VALID_UUID }]));
    mockDb.update.mockReturnValue(chain([{ id: VALID_UUID }]));
    
    const result = await createBulkDisposalRequests(validInput);
    expect(result.success).toBe(true);
    expect(result.inserted).toBe(1);
    
    expect(mockDb.insert).toHaveBeenCalledTimes(2); // disposals, audit
    expect(mockDb.update).toHaveBeenCalledTimes(2); // assets, assignments
    expect(mockDispatchWebhookEvent).toHaveBeenCalledWith('disposal.requested', expect.any(Object));

    expect(revalidatePath).toHaveBeenCalledWith('/operations/disposals');
    expect(revalidatePath).toHaveBeenCalledWith('/assets');
    expect(revalidatePath).toHaveBeenCalledWith('/assets/hardware');
    expect(revalidatePath).toHaveBeenCalledWith('/assets/furniture');
    expect(revalidatePath).toHaveBeenCalledWith('/assets/office-electronics');
    expect(revalidatePath).toHaveBeenCalledWith('/assets/software');
  });
});

describe('rejectDisposalRequest', () => {
  let formData: FormData;
  
  beforeEach(() => {
    vi.clearAllMocks();
    formData = new FormData();
    formData.append('disposalIds', JSON.stringify([1]));
    formData.append('assetIds', JSON.stringify([VALID_UUID]));
    formData.append('rejectionReason', 'Still useful');
    formData.append('fallbackStatus', 'Available');
  });

  it('returns forbidden for non-admin', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(IT_OPERATOR_USER);
    const result = await rejectDisposalRequest({} as unknown as DisposalFormState, formData);
    expect(result.success).toBe(false);
    expect(result.message).toContain('FORBIDDEN');
  });

  it('returns validation error on bad schema', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    formData.set('rejectionReason', 'a'); // too short
    const result = await rejectDisposalRequest({} as unknown as DisposalFormState, formData);
    expect(result.success).toBe(false);
    expect(result.message).toBe('Validation failed.');
  });

  it('rejects, reverts asset status to fallback, logs audit', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.select.mockReturnValueOnce(chain([{ id: 1, assetId: VALID_UUID, status: 'Pending Approval' }])); // disposals
    mockDb.select.mockReturnValueOnce(chain([{ id: VALID_UUID, status: 'Pending Disposal', isArchived: true }])); // assets
    
    mockDb.update.mockReturnValue(chain([{ id: 1 }]));
    
    const result = await rejectDisposalRequest({} as unknown as DisposalFormState, formData);
    expect(result.success).toBe(true);
    expect(mockDb.update).toHaveBeenCalledTimes(2); // disposals, assets
    expect(mockDb.insert).toHaveBeenCalledTimes(1); // audit

    expect(revalidatePath).toHaveBeenCalledWith('/operations/disposals');
    expect(revalidatePath).toHaveBeenCalledWith('/operations/maintenance');
    expect(revalidatePath).toHaveBeenCalledWith('/assets');
    expect(revalidatePath).toHaveBeenCalledWith('/assets/hardware');
    expect(revalidatePath).toHaveBeenCalledWith('/assets/furniture');
    expect(revalidatePath).toHaveBeenCalledWith('/assets/office-electronics');
    expect(revalidatePath).toHaveBeenCalledWith('/assets/software');
  });

  it('creates maintenance ticket if fallbackStatus is In Repair', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    formData.set('fallbackStatus', 'In Repair');
    formData.set('maintenanceIssue', 'Needs screen fixing');
    
    mockDb.select.mockReturnValueOnce(chain([{ id: 1, assetId: VALID_UUID, status: 'Pending Approval' }]));
    mockDb.select.mockReturnValueOnce(chain([{ id: VALID_UUID, status: 'Pending Disposal', isArchived: true }]));
    
    mockDb.update.mockReturnValue(chain([{ id: 1 }]));
    
    const result = await rejectDisposalRequest({} as unknown as DisposalFormState, formData);
    expect(result.success).toBe(true);
    expect(mockDb.insert).toHaveBeenCalledTimes(2); // tickets, audit

    expect(revalidatePath).toHaveBeenCalledWith('/operations/disposals');
    expect(revalidatePath).toHaveBeenCalledWith('/operations/maintenance');
    expect(revalidatePath).toHaveBeenCalledWith('/assets');
    expect(revalidatePath).toHaveBeenCalledWith('/assets/hardware');
    expect(revalidatePath).toHaveBeenCalledWith('/assets/furniture');
    expect(revalidatePath).toHaveBeenCalledWith('/assets/office-electronics');
    expect(revalidatePath).toHaveBeenCalledWith('/assets/software');
  });
});

describe('uploadDisposalReceipt', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns forbidden for non-admin', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(IT_OPERATOR_USER);
    const result = await uploadDisposalReceipt(new FormData());
    expect(result.success).toBe(false);
  });

  it('returns failure if no file provided', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const result = await uploadDisposalReceipt(new FormData());
    expect(result.success).toBe(false);
  });

  it('uploads file and returns URL', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const fd = new FormData();
    fd.append('file', new File(['test'], 'test.pdf', { type: 'application/pdf' }));
    
    const result = await uploadDisposalReceipt(fd);
    expect(result.success).toBe(true);
    if ('url' in result) {
      expect(result.url).toBe('https://storage.example.com/receipt.pdf');
    }
  });
});

describe('executeAssetDisposal', () => {
  let formData: FormData;
  
  beforeEach(() => {
    vi.clearAllMocks();
    formData = new FormData();
    formData.append('disposalIds', JSON.stringify([1]));
    formData.append('assetIds', JSON.stringify([VALID_UUID]));
    formData.append('reason', 'End of life');
    formData.append('disposalMethod', 'Donated');
    formData.append('dataWiped', 'true');
    formData.append('tagsRemoved', 'true');
    formData.append('receiptUrls', JSON.stringify(['https://example.com/receipt.pdf']));
  });

  it('returns forbidden for non-admin', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(IT_OPERATOR_USER);
    const result = await executeAssetDisposal({} as unknown as DisposalFormState, formData);
    expect(result.success).toBe(false);
  });

  it('returns validation error on bad schema', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    formData.set('dataWiped', 'false');
    const result = await executeAssetDisposal({} as unknown as DisposalFormState, formData);
    expect(result.success).toBe(false);
  });

  it('executes disposal, marks asset Disposed and archived, saves receipt, logs audit', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.select.mockReturnValueOnce(chain([{ disposalId: 1, assetId: VALID_UUID, status: 'Pending Approval' }])); // disposals
    mockDb.select.mockReturnValueOnce(chain([{ id: VALID_UUID, status: 'Pending Disposal' }])); // assets
    
    mockDb.update.mockReturnValue(chain([{ id: 1 }]));
    
    const result = await executeAssetDisposal({} as unknown as DisposalFormState, formData);
    expect(result.success).toBe(true);
    
    // Updates: disposals, assets
    expect(mockDb.update).toHaveBeenCalledTimes(2);
    // Inserts: documents, audit
    expect(mockDb.insert).toHaveBeenCalledTimes(2);
    // Webhook
    expect(mockDispatchWebhookEvent).toHaveBeenCalledWith('disposal.approved', expect.any(Object));

    expect(revalidatePath).toHaveBeenCalledWith('/operations/disposals');
    expect(revalidatePath).toHaveBeenCalledWith('/assets');
    expect(revalidatePath).toHaveBeenCalledWith('/assets/hardware');
    expect(revalidatePath).toHaveBeenCalledWith('/assets/furniture');
    expect(revalidatePath).toHaveBeenCalledWith('/assets/office-electronics');
    expect(revalidatePath).toHaveBeenCalledWith('/assets/software');
  });
});
