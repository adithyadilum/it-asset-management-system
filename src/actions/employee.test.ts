import { describe, it, expect, vi, beforeEach } from 'vitest';
import { revalidatePath } from 'next/cache';
import { ADMIN_USER, EMPLOYEE_USER } from '@/test/fixtures/users';

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
    update: vi.fn().mockReturnValue(chain([])),
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
  assetAssignments: {
    id: 'assetAssignments.id',
    assignedToUserId: 'assetAssignments.assignedToUserId',
    state: 'assetAssignments.state',
  },
  assets: { id: 'assets.id' },
  categories: { id: 'categories.id' },
  models: { id: 'models.id' },
  notificationQueue: { id: 'notificationQueue.id' },
  softwareAllocations: {
    id: 'softwareAllocations.id',
    assignedToUserId: 'softwareAllocations.assignedToUserId',
    licenseId: 'softwareAllocations.licenseId',
    allocatedAt: 'softwareAllocations.allocatedAt',
    revokedAt: 'softwareAllocations.revokedAt',
  },
  softwareLicenses: {
    id: 'softwareLicenses.id',
    assetId: 'softwareLicenses.assetId',
    modelId: 'softwareLicenses.modelId',
    licenseKey: 'softwareLicenses.licenseKey',
    licenseType: 'softwareLicenses.licenseType',
    isActive: 'softwareLicenses.isActive',
  },
}));

const mockDispatchAlert = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/notifications/dispatcher', () => ({
  dispatchAlert: (...args: unknown[]) => mockDispatchAlert(...args),
}));

const mockGetPortalAlerts = vi.fn().mockResolvedValue({});
vi.mock('@/lib/data/portal-repo', () => ({
  getPortalAlerts: (...args: unknown[]) => mockGetPortalAlerts(...args),
}));

vi.mock('@/lib/audit', () => ({
  logAuditActionTx: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import {
  getCurrentEmployeeAssets,
  getCurrentEmployeeSoftwareAssets,
  acceptAssignmentAction,
  rejectAssignmentAction,
  getPortalAlertsAction,
} from '@/actions/employee';

describe('getCurrentEmployeeAssets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws unauthorized if user is not authenticated', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    await expect(getCurrentEmployeeAssets()).rejects.toThrow('Unauthorized');
  });

  it('returns assigned assets for the current user', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    const mockDate = new Date('2023-01-01');
    mockDb.select.mockReturnValueOnce(
      chain([
        {
          assignmentId: 1,
          assetId: '10',
          assetTag: 'LPT-001',
          serialNumber: 'SN123',
          modelName: 'ThinkPad',
          status: 'Assigned',
          assignedDate: mockDate,
          pillar: 'Hardware',
        },
      ])
    );

    const res = await getCurrentEmployeeAssets();
    expect(res).toHaveLength(1);
    expect(res[0].assignedDate).toBe(mockDate.toISOString());
  });
});

describe('getCurrentEmployeeSoftwareAssets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws unauthorized if user is not authenticated', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    await expect(getCurrentEmployeeSoftwareAssets()).rejects.toThrow(
      'Unauthorized'
    );
  });

  it('returns active software allocations for the current user', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    const mockDate = new Date('2023-02-01');
    mockDb.select.mockReturnValueOnce(
      chain([
        {
          allocationId: 7,
          assetId: 'software-asset-id',
          assetTag: 'SFT-001',
          licenseKey: 'LIC-123',
          modelName: 'Microsoft 365',
          allocatedDate: mockDate,
          licenseType: 'Subscription',
        },
      ])
    );

    const res = await getCurrentEmployeeSoftwareAssets();
    expect(res).toEqual([
      {
        allocationId: 7,
        assetId: 'software-asset-id',
        assetTag: 'SFT-001',
        licenseKey: 'LIC-123',
        modelName: 'Microsoft 365',
        status: 'active',
        allocatedDate: mockDate.toISOString(),
        licenseType: 'Subscription',
        pillar: 'Software',
      },
    ]);
  });
});

describe('acceptAssignmentAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns unauthorized if unauthenticated', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    const res = await acceptAssignmentAction(1);
    expect(res.success).toBe(false);
    expect(res.error).toBe('Unauthorized');
  });

  it('returns error if assignment not found', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    mockDb.select.mockReturnValueOnce(chain([]));

    const res = await acceptAssignmentAction(1);
    expect(res.success).toBe(false);
    expect(res.error).toBe('Assignment not found');
  });

  it('returns error if assignment does not belong to user', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    mockDb.select.mockReturnValueOnce(
      chain([{ assignedToUserId: 'other-user', state: 'pending approval' }])
    );

    const res = await acceptAssignmentAction(1);
    expect(res.success).toBe(false);
    expect(res.error).toBe('Assignment does not belong to the current user');
  });

  it('returns error if assignment is not pending approval', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    mockDb.select.mockReturnValueOnce(
      chain([{ assignedToUserId: EMPLOYEE_USER.id, state: 'assigned' }])
    );

    const res = await acceptAssignmentAction(1);
    expect(res.success).toBe(false);
    expect(res.error).toBe('Assignment is not pending approval');
  });

  it('successfully accepts assignment and dispatches alert', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    mockDb.select.mockReturnValueOnce(
      chain([
        {
          assignedToUserId: EMPLOYEE_USER.id,
          state: 'pending approval',
          assignedById: ADMIN_USER.id,
        },
      ])
    );
    mockDb.update.mockReturnValue(chain([{ id: 1 }]));

    const res = await acceptAssignmentAction(1);
    expect(res.success).toBe(true);
    expect(mockDispatchAlert).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard');
  });
});

describe('rejectAssignmentAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns validation error if reason is empty', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    const res = await rejectAssignmentAction(1, '');
    expect(res.success).toBe(false);
  });

  it('successfully rejects assignment and dispatches alert', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    mockDb.select.mockReturnValueOnce(
      chain([
        {
          assignedToUserId: EMPLOYEE_USER.id,
          state: 'pending approval',
          assignedById: ADMIN_USER.id,
          assetId: '10',
        },
      ])
    );
    mockDb.update.mockReturnValue(chain([{ id: 1 }]));

    const res = await rejectAssignmentAction(1, 'Damaged on arrival');
    expect(res.success).toBe(true);
    expect(mockDispatchAlert).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard');
  });
});

describe('getPortalAlertsAction', () => {
  it('delegates to getPortalAlerts', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    await getPortalAlertsAction();
    expect(mockGetPortalAlerts).toHaveBeenCalledWith(EMPLOYEE_USER.id);
  });
});
