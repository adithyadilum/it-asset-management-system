import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ADMIN_USER, EMPLOYEE_USER } from '@/test/fixtures/users';

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
    select: vi.fn().mockReturnValue(chain([])),
  };
  return { mockDb: db, chain };
});

vi.mock('@/db', () => ({ db: mockDb }));
vi.mock('@/db/schema', () => ({
  assetAssignments: { id: 'assetAssignments.id', assignedToUserId: 'assetAssignments.assignedToUserId', state: 'assetAssignments.state' },
  systemAuditLogs: { id: 'systemAuditLogs.id', actionType: 'systemAuditLogs.actionType', entityId: 'systemAuditLogs.entityId', performedAt: 'systemAuditLogs.performedAt', entityType: 'systemAuditLogs.entityType' },
}));

import { getAdminMobileMetrics } from '@/actions/mobile';

describe('getAdminMobileMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws unauthorized if user is not authenticated', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    await expect(getAdminMobileMetrics()).rejects.toThrow('Unauthorized access');
  });

  it('throws unauthorized if user is an employee', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    await expect(getAdminMobileMetrics()).rejects.toThrow('Unauthorized access');
  });

  it('returns metrics for admin user', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    
    // First call: assignedAssetCount (returns 2 items)
    mockDb.select.mockReturnValueOnce(chain([{ count: 1 }, { count: 2 }]));
    
    // Second call: pendingApprovalsCount (returns 1 item)
    mockDb.select.mockReturnValueOnce(chain([{ count: 1 }]));
    
    // Third call: recentActivities (returns 1 item)
    mockDb.select.mockReturnValueOnce(chain([
      { id: 1, action: 'CREATE', assetId: '10', timestamp: new Date('2023-01-01') }
    ]));
    
    const res = await getAdminMobileMetrics();
    
    expect(res.assignedAssetCount).toBe(2);
    expect(res.pendingApprovalsCount).toBe(1);
    expect(res.recentActivities.length).toBe(1);
    expect(res.recentActivities[0].assetId).toBe(10);
    expect(res.recentActivities[0].action).toBe('CREATE');
  });
});
