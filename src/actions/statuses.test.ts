import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ADMIN_USER, EMPLOYEE_USER, IT_OPERATOR_USER } from '@/test/fixtures/users';

const mockGetAuthenticatedUser = vi.fn();
vi.mock('@/lib/auth/get-authenticated-user', () => ({
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
    delete: vi.fn().mockReturnValue(chain([])),
    select: vi.fn().mockReturnValue(chain([])),
  };
  return { mockDb: db, chain };
});

vi.mock('@/db', () => ({ db: mockDb }));
vi.mock('@/db/schema', () => ({
  customStatuses: { id: 'customStatuses.id', name: 'customStatuses.name', iconName: 'customStatuses.iconName', colorTheme: 'customStatuses.colorTheme', isActive: 'customStatuses.isActive', createdAt: 'customStatuses.createdAt' },
}));

vi.mock('@/lib/latency', () => ({
  startLatencyTimer: vi.fn().mockReturnValue(0),
  logLatency: vi.fn(),
  logError: vi.fn(),
}));

import {
  getCustomStatuses,
  createCustomStatus,
  deleteCustomStatus,
  getManualOverrideStatuses,
} from '@/actions/statuses';

describe('getCustomStatuses', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws UNAUTHENTICATED when user is not logged in', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    await expect(getCustomStatuses()).rejects.toThrow('UNAUTHENTICATED');
  });

  it('returns custom statuses for authenticated user', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    const mockData = [{ id: 1, name: 'Stolen', iconName: 'alert-triangle', colorTheme: 'red', isActive: true, createdAt: new Date() }];
    mockDb.select.mockReturnValueOnce(chain(mockData));
    
    const result = await getCustomStatuses();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Stolen');
  });
});

describe('createCustomStatus', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws UNAUTHENTICATED when user is not logged in', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    await expect(createCustomStatus('New Status', 'blue', 'star')).rejects.toThrow('UNAUTHENTICATED');
  });

  it('throws FORBIDDEN for Employee', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    await expect(createCustomStatus('New Status', 'blue', 'star')).rejects.toThrow('FORBIDDEN');
  });

  it('throws FORBIDDEN for ITOperator', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(IT_OPERATOR_USER);
    await expect(createCustomStatus('New Status', 'blue', 'star')).rejects.toThrow('FORBIDDEN');
  });

  it('rejects invalid inputs (zod schema)', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    // Name too short
    await expect(createCustomStatus('N', 'blue', 'star')).rejects.toThrow();
  });

  it('successfully creates status', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const mockResult = [{ id: 1, name: 'Lost', colorTheme: 'gray', iconName: 'help-circle', isActive: true }];
    mockDb.insert.mockReturnValueOnce(chain(mockResult));
    
    const result = await createCustomStatus('Lost', 'gray', 'help-circle');
    expect(result.id).toBe(1);
    expect(result.name).toBe('Lost');
  });

  it('throws mapped error for unique constraint violation', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.insert.mockImplementationOnce(() => {
      throw { code: '23505' }; // Postgres unique violation
    });
    
    await expect(createCustomStatus('Duplicate', 'gray', 'help-circle')).rejects.toThrow('A status with this name already exists.');
  });
});

describe('deleteCustomStatus', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws UNAUTHENTICATED when user is not logged in', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    await expect(deleteCustomStatus(1)).rejects.toThrow('UNAUTHENTICATED');
  });

  it('throws FORBIDDEN for Employee', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
    await expect(deleteCustomStatus(1)).rejects.toThrow('FORBIDDEN');
  });

  it('successfully deletes status as GlobalAdmin', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    mockDb.delete.mockReturnValueOnce(chain([{ id: 1 }]));
    
    const result = await deleteCustomStatus(1);
    expect(result.success).toBe(true);
  });
});

describe('getManualOverrideStatuses', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws UNAUTHENTICATED when user is not logged in', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    await expect(getManualOverrideStatuses()).rejects.toThrow('UNAUTHENTICATED');
  });

  it('combines built-in statuses and active custom statuses', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
    const customData = [{ name: 'Stolen', colorTheme: 'red', iconName: 'alert-triangle' }];
    mockDb.select.mockReturnValueOnce(chain(customData));
    
    const result = await getManualOverrideStatuses();
    
    // built in manual overrides are usually 'Available', 'In Repair', etc.
    expect(result.length).toBeGreaterThan(customData.length);
    expect(result.find(s => s.value === 'Stolen')).toBeDefined();
    expect(result.find(s => s.value === 'Available')).toBeDefined();
  });
});
