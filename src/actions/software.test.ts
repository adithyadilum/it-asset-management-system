import { describe, it, expect, vi, beforeEach } from 'vitest';
import { revalidatePath, revalidateTag } from 'next/cache';
import { ADMIN_USER, EMPLOYEE_USER } from '@/test/fixtures/users';
import {
  allocateSoftwareLicensesAction,
  revokeSoftwareLicenseAllocationAction,
} from '@/actions/software';

const mockGetAuthenticatedUser = vi.fn();
vi.mock('@/actions/auth', () => ({
  getAuthenticatedUser: () => mockGetAuthenticatedUser(),
}));

const { mockDb, mockTransaction } = vi.hoisted(() => {
  const updateReturning = vi.fn().mockResolvedValue([{ id: 10 }]);
  const tx = {
    query: {
      softwareLicenses: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn(() => ({
      values: vi.fn(),
    })),
    updateReturning,
    update: vi.fn(() => ({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: updateReturning,
    })),
  };

  const db = {
    transaction: vi.fn(async (cb) => {
      try {
        return await cb(tx);
      } catch (e) {
        throw e;
      }
    }),
  };

  return { mockDb: db, mockTransaction: tx };
});

vi.mock('@/db', () => ({ db: mockDb }));
vi.mock('@/db/schema', () => ({
  softwareLicenses: { id: 'softwareLicenses.id', assetId: 'softwareLicenses.assetId' },
  softwareAllocations: {
    id: 'softwareAllocations.id',
    licenseId: 'softwareAllocations.licenseId',
    assignedToUserId: 'softwareAllocations.assignedToUserId',
    revokedAt: 'softwareAllocations.revokedAt',
  },
}));

vi.mock('@/lib/audit', () => ({
  logAuditActionTx: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/latency', () => ({
  startLatencyTimer: vi.fn().mockReturnValue(0),
  logLatency: vi.fn(),
  logError: vi.fn(),
}));

const VALID_ASSET_ID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_USER_ID_1 = 'user-1';
const VALID_USER_ID_2 = 'user-2';

describe('allocateSoftwareLicensesAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns unauthorized when user is not logged in', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    const result = await allocateSoftwareLicensesAction(VALID_ASSET_ID, [VALID_USER_ID_1]);
    expect(result).toEqual({ success: false, error: 'Unauthorized: Please sign in.' });
  });

  it('returns forbidden for non-admin roles', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    const result = await allocateSoftwareLicensesAction(VALID_ASSET_ID, [VALID_USER_ID_1]);
    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toContain('Forbidden');
  });

  it('returns error if no users are selected', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const result = await allocateSoftwareLicensesAction(VALID_ASSET_ID, []);
    expect(result).toEqual({ success: false, error: 'No users selected.' });
  });

  it('returns error if software license is not found', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockTransaction.query.softwareLicenses.findFirst.mockResolvedValue(null);
    
    const result = await allocateSoftwareLicensesAction(VALID_ASSET_ID, [VALID_USER_ID_1]);
    expect(result).toEqual({ success: false, error: 'Software license not found for this asset.' });
  });

  it('returns error if not enough seats are available', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockTransaction.query.softwareLicenses.findFirst.mockResolvedValue({
      id: 1,
      totalSeats: 2,
      allocations: [
        { assignedToUserId: 'other-user-1' },
        { assignedToUserId: 'other-user-2' },
      ],
    });
    
    const result = await allocateSoftwareLicensesAction(VALID_ASSET_ID, [VALID_USER_ID_1]);
    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toContain('Cannot allocate 1 users. Only 0 seats available.');
  });

  it('returns error if all selected users are already allocated', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockTransaction.query.softwareLicenses.findFirst.mockResolvedValue({
      id: 1,
      totalSeats: 5,
      allocations: [
        { assignedToUserId: VALID_USER_ID_1 },
      ],
    });
    
    const result = await allocateSoftwareLicensesAction(VALID_ASSET_ID, [VALID_USER_ID_1]);
    expect(result).toEqual({ success: false, error: 'All selected users are already allocated to this software.' });
  });

  it('allocates new users successfully and filters out duplicates', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockTransaction.query.softwareLicenses.findFirst.mockResolvedValue({
      id: 1,
      totalSeats: 5,
      allocations: [
        { assignedToUserId: VALID_USER_ID_1 }, // user 1 already assigned
      ],
    });
    
    const result = await allocateSoftwareLicensesAction(VALID_ASSET_ID, [VALID_USER_ID_1, VALID_USER_ID_2]);
    
    expect(result).toEqual({ success: true, allocatedCount: 1 });
    expect(mockTransaction.insert).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith('/assets');
    expect(revalidatePath).toHaveBeenCalledWith('/assets/software');
    expect(revalidatePath).toHaveBeenCalledWith('/my-assets');
    expect(revalidateTag).toHaveBeenCalledWith('dashboard-kpis', 'max');
  });
});

describe('revokeSoftwareLicenseAllocationAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.updateReturning.mockResolvedValue([{ id: 10 }]);
  });

  it('returns unauthorized when user is not logged in', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    const result = await revokeSoftwareLicenseAllocationAction(VALID_ASSET_ID, VALID_USER_ID_1);
    expect(result).toEqual({ success: false, error: 'Unauthorized: Please sign in.' });
  });

  it('returns forbidden for non-admin roles', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    const result = await revokeSoftwareLicenseAllocationAction(VALID_ASSET_ID, VALID_USER_ID_1);
    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toContain('Forbidden');
  });

  it('revokes an active software allocation and revalidates affected views', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockTransaction.query.softwareLicenses.findFirst.mockResolvedValue({
      id: 'license-1',
    });

    const result = await revokeSoftwareLicenseAllocationAction(VALID_ASSET_ID, VALID_USER_ID_1);

    expect(result).toEqual({ success: true });
    expect(mockTransaction.update).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith('/assets');
    expect(revalidatePath).toHaveBeenCalledWith('/assets/software');
    expect(revalidatePath).toHaveBeenCalledWith('/my-assets');
    expect(revalidateTag).toHaveBeenCalledWith('dashboard-kpis', 'max');
  });

  it('returns an error when no active allocation exists for the user', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockTransaction.query.softwareLicenses.findFirst.mockResolvedValue({
      id: 'license-1',
    });
    mockTransaction.updateReturning.mockResolvedValueOnce([]);

    const result = await revokeSoftwareLicenseAllocationAction(VALID_ASSET_ID, VALID_USER_ID_1);

    expect(result).toEqual({
      success: false,
      error: 'Active software allocation not found for this user.',
    });
  });
});
