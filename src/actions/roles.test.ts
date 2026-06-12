import { describe, it, expect, vi, beforeEach } from 'vitest';
import { revalidatePath } from 'next/cache';
import {
  ADMIN_USER,
  IT_OPERATOR_USER,
  FINANCE_AUDITOR_USER,
  EMPLOYEE_USER,
  TARGET_USER,
} from '@/test/fixtures/users';

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
    ['select', 'from', 'where', 'leftJoin', 'set', 'limit', 'returning'].forEach(
      (m) => (c[m] = vi.fn().mockReturnThis())
    );
    c.returning = vi.fn().mockResolvedValue(resolvedValue);
    // Make it thenable for `await db.select()...`
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
      select: vi.fn(),
      update: vi.fn(),
      query: {
        users: {
          findFirst: vi.fn(),
          findMany: vi.fn(),
        },
      },
    },
    chain
  };
});

vi.mock('@/db', () => ({ db: mockDb }));
vi.mock('@/db/schema', () => ({
  departments: { name: 'departments.name', id: 'departments.id' },
  users: {
    id: 'users.id',
    name: 'users.name',
    email: 'users.email',
    role: 'users.role',
    departmentId: 'users.departmentId',
  },
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

vi.mock('@/lib/auth/uuid', () => ({
  isValidUuid: (v: unknown) =>
    typeof v === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v),
}));

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------

import {
  searchUsers,
  assignUserRole,
  assignUsersRoleBulk,
  removeUserFromManagedRole,
} from '@/actions/roles';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('searchUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws when user is unauthenticated', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    await expect(searchUsers('test')).rejects.toThrow('Forbidden');
  });

  it('throws when user is Employee', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    await expect(searchUsers('test')).rejects.toThrow('Forbidden');
  });

  it('throws when user is ITOperator', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(IT_OPERATOR_USER);
    await expect(searchUsers('test')).rejects.toThrow('Forbidden');
  });

  it('throws when user is FinanceAuditor', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(FINANCE_AUDITOR_USER);
    await expect(searchUsers('test')).rejects.toThrow('Forbidden');
  });

  it('returns empty array for empty query', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const result = await searchUsers('');
    expect(result).toEqual([]);
  });

  it('returns empty array for whitespace-only query', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const result = await searchUsers('   ');
    expect(result).toEqual([]);
  });

  it('queries the database for valid search term', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);

    const mockResults = [
      { id: 'u1', name: 'Alice', email: 'alice@test.com', department: 'IT', role: 'Employee' },
    ];
    mockDb.select.mockReturnValue(chain(mockResults));

    const result = await searchUsers('alice');
    expect(result).toEqual(mockResults);
    expect(mockDb.select).toHaveBeenCalled();
  });
});

describe('assignUserRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws when user is unauthenticated', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    await expect(assignUserRole(TARGET_USER.id, 'ITOperator')).rejects.toThrow('Forbidden');
  });

  it('throws when user is not GlobalAdmin', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(IT_OPERATOR_USER);
    await expect(assignUserRole(TARGET_USER.id, 'Employee')).rejects.toThrow('Forbidden');
  });

  it('throws for invalid UUID target', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    await expect(assignUserRole('not-a-uuid', 'Employee')).rejects.toThrow('Invalid target user id');
  });

  it('throws for invalid role value', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
     
    await expect(assignUserRole(TARGET_USER.id, 'SuperUser' as any)).rejects.toThrow(
      'Invalid role value'
    );
  });

  it('throws when admin tries to modify own role (anti-lockout)', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    await expect(assignUserRole(ADMIN_USER.id, 'Employee')).rejects.toThrow(
      'cannot modify your own role'
    );
  });

  it('returns error when target user not found (no rows updated)', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.query.users.findFirst.mockResolvedValue({ id: TARGET_USER.id, role: 'Employee' });
    mockDb.update.mockReturnValue(chain([])); // 0 rows returned

    const result = await assignUserRole(TARGET_USER.id, 'ITOperator');
    expect(result).toEqual({ success: false, error: expect.stringContaining('not found') });
  });

  it('successfully updates role and logs audit', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.query.users.findFirst.mockResolvedValue({ id: TARGET_USER.id, role: 'Employee' });
    mockDb.update.mockReturnValue(
      chain([{ updatedId: TARGET_USER.id, updatedRole: 'ITOperator' }])
    );

    const result = await assignUserRole(TARGET_USER.id, 'ITOperator');
    expect(result).toEqual({ success: true });
    expect(mockLogAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'users',
        entityId: TARGET_USER.id,
        actionType: 'UPDATE',
        performedById: ADMIN_USER.id,
      })
    );
    expect(revalidatePath).toHaveBeenCalledWith('/settings/roles');
  });
});

describe('assignUsersRoleBulk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws when user is not GlobalAdmin', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    await expect(assignUsersRoleBulk([TARGET_USER.id], 'ITOperator')).rejects.toThrow(
      'Forbidden'
    );
  });

  it('throws for invalid role value', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
     
    await expect(assignUsersRoleBulk([TARGET_USER.id], 'BadRole' as any)).rejects.toThrow(
      'Invalid role value'
    );
  });

  it('returns error when user IDs array is empty', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const result = await assignUsersRoleBulk([], 'ITOperator');
    expect(result).toEqual({
      success: false,
      error: expect.stringContaining('at least one valid user'),
    });
  });

  it('returns error when all user IDs are invalid UUIDs', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const result = await assignUsersRoleBulk(['not-uuid', '123'], 'ITOperator');
    expect(result).toEqual({
      success: false,
      error: expect.stringContaining('at least one valid user'),
    });
  });

  it('throws when bulk includes the admin own user ID (anti-lockout)', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    await expect(
      assignUsersRoleBulk([TARGET_USER.id, ADMIN_USER.id], 'Employee')
    ).rejects.toThrow('cannot modify your own role');
  });

  it('updates all valid users and returns correct counts', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.query.users.findMany.mockResolvedValue([
      { id: TARGET_USER.id, role: 'Employee' },
    ]);
    mockDb.update.mockReturnValue(
      chain([{ updatedId: TARGET_USER.id, updatedRole: 'ITOperator' }])
    );

    const result = await assignUsersRoleBulk([TARGET_USER.id], 'ITOperator');
    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        count: 1,
        updatedCount: 1,
      })
    );
    expect(revalidatePath).toHaveBeenCalledWith('/settings/roles');
  });

  it('logs individual audit entries per user', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const user2Id = '00000000-0000-4000-a000-000000000098';
    mockDb.query.users.findMany.mockResolvedValue([
      { id: TARGET_USER.id, role: 'Employee' },
      { id: user2Id, role: 'Employee' },
    ]);
    mockDb.update.mockReturnValue(
      chain([
        { updatedId: TARGET_USER.id, updatedRole: 'ITOperator' },
        { updatedId: user2Id, updatedRole: 'ITOperator' },
      ])
    );

    await assignUsersRoleBulk([TARGET_USER.id, user2Id], 'ITOperator');
    expect(mockLogAuditAction).toHaveBeenCalledTimes(2);
  });

  it('deduplicates user IDs', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.query.users.findMany.mockResolvedValue([{ id: TARGET_USER.id, role: 'Employee' }]);
    mockDb.update.mockReturnValue(
      chain([{ updatedId: TARGET_USER.id, updatedRole: 'ITOperator' }])
    );

    const result = await assignUsersRoleBulk(
      [TARGET_USER.id, TARGET_USER.id, TARGET_USER.id],
      'ITOperator'
    );
    expect(result).toEqual(expect.objectContaining({ success: true }));
    expect(revalidatePath).toHaveBeenCalledWith('/settings/roles');
  });

  it('returns error on database failure', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.query.users.findMany.mockRejectedValue(new Error('DB down'));

    const result = await assignUsersRoleBulk([TARGET_USER.id], 'ITOperator');
    expect(result).toEqual({
      success: false,
      error: 'Database update failed.',
    });
  });
});

describe('removeUserFromManagedRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates to assignUserRole with Employee role', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.query.users.findFirst.mockResolvedValue({ id: TARGET_USER.id, role: 'ITOperator' });
    mockDb.update.mockReturnValue(
      chain([{ updatedId: TARGET_USER.id, updatedRole: 'Employee' }])
    );

    const result = await removeUserFromManagedRole(TARGET_USER.id);
    expect(result).toEqual({ success: true });
  });
});
