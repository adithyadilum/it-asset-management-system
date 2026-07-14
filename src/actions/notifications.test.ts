import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  saveIntegrationSettings,
  testIntegrationConnection,
} from '@/actions/notifications';
import { ADMIN_USER, EMPLOYEE_USER } from '@/test/fixtures/users';

// Mocks
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

vi.mock('@/lib/latency', () => ({
  startLatencyTimer: vi.fn().mockReturnValue(0),
  logLatency: vi.fn(),
  logError: vi.fn(),
}));

const mockEncrypt = vi.fn().mockImplementation((val) => `encrypted_${val}`);
const mockDecrypt = vi
  .fn()
  .mockImplementation((val) => val.replace('encrypted_', ''));
vi.mock('@/lib/crypto', () => ({
  encrypt: (v: string) => mockEncrypt(v),
  decrypt: (v: string) => mockDecrypt(v),
}));

const mockLogAuditAction = vi.fn();
vi.mock('@/lib/audit', () => ({
  logAuditAction: (...args: unknown[]) => mockLogAuditAction(...args),
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
      'groupBy',
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
    insert: vi.fn().mockReturnValue(chain([])),
  };
  return { mockDb: db, chain };
});

vi.mock('@/db', () => ({ db: mockDb }));
vi.mock('@/db/schema', () => ({
  appNotifications: {
    userId: 'appNotifications.userId',
    isRead: 'appNotifications.isRead',
    id: 'appNotifications.id',
    createdAt: 'appNotifications.createdAt',
  },
  integrationSettings: { id: 'integrationSettings.id' },
}));

const mockResendSend = vi.fn();
vi.mock('resend', () => {
  return {
    Resend: class {
      emails = { send: mockResendSend };
    },
  };
});

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Notifications Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUnreadCount', () => {
    it('returns 0 if no user', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(null);
      const res = await getUnreadCount();
      expect(res).toBe(0);
    });

    it('accurately reflects only unread messages', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
      mockDb.select.mockReturnValueOnce(chain([{ count: 5 }]));
      const res = await getUnreadCount();
      expect(res).toBe(5);
    });
  });

  describe('markAsRead & markAllAsRead', () => {
    it('markAsRead successfully updates the isRead flag for a notification', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
      mockDb.update.mockReturnValueOnce(
        chain([{ id: '00000000-0000-4000-a000-000000000001' }])
      );
      await markAsRead('00000000-0000-4000-a000-000000000001');
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('markAllAsRead updates all unread notifications', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
      mockDb.update.mockReturnValueOnce(
        chain([{ id: '00000000-0000-4000-a000-000000000001' }])
      );
      await markAllAsRead();
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('saveIntegrationSettings', () => {
    it('encrypts credentials before storing in DB', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
      mockDb.select.mockReturnValueOnce(chain([])); // Not existing -> will insert
      mockDb.insert.mockReturnValueOnce(chain([{ id: 1 }]));

      const res = await saveIntegrationSettings({
        resendApiKey: 'my-resend-key',
        teamsWebhookUrl: 'https://outlook.office.com/webhook',
      });

      expect(res.success).toBe(true);
      expect(mockEncrypt).toHaveBeenCalledWith('my-resend-key');
      expect(mockEncrypt).toHaveBeenCalledWith(
        'https://outlook.office.com/webhook'
      );
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('returns error if user is not GlobalAdmin', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(EMPLOYEE_USER);
      const res = await saveIntegrationSettings({ resendApiKey: 'key' });
      expect(res.success).toBe(false);
      expect(res.error).toContain('Forbidden');
    });

    it('rejects invalid teams webhook URLs', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
      const res = await saveIntegrationSettings({
        teamsWebhookUrl: 'https://malicious.com/webhook',
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('Invalid Teams Webhook URL');
    });
  });

  describe('testIntegrationConnection', () => {
    it('tests Resend successfully using mock', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
      mockDb.select.mockReturnValueOnce(
        chain([{ id: 1, resendApiKey: 'encrypted_api-key' }])
      );
      mockResendSend.mockResolvedValueOnce({
        data: { id: 'msg-id' },
        error: null,
      });

      const res = await testIntegrationConnection('email', {});
      expect(res.success).toBe(true);
      expect(mockDecrypt).toHaveBeenCalledWith('encrypted_api-key');
      expect(mockResendSend).toHaveBeenCalled();
    });

    it('tests Teams successfully using mock fetch', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(ADMIN_USER);
      mockDb.select.mockReturnValueOnce(
        chain([
          {
            id: 1,
            teamsWebhookUrl: 'encrypted_https://outlook.office.com/webhook',
          },
        ])
      );
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 } as Response);

      const res = await testIntegrationConnection('teams', {});
      expect(res.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://outlook.office.com/webhook',
        expect.any(Object)
      );
    });
  });
});
