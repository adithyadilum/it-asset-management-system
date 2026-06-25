/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.UPSTASH_REDIS_REST_URL = 'https://mock.upstash.io';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-token';
});

// ── Mock: Upstash Redis ──────────────────────────────────────────────────────
const mockRedisSet = vi.fn().mockResolvedValue('OK');

vi.mock('@upstash/redis', () => ({
  Redis: class {
    set = (key: string, value: unknown, options?: unknown) =>
      mockRedisSet(key, value, options);
  },
}));

// ── Mock: NextAuth session ───────────────────────────────────────────────────
const mockGetServerSession = vi.fn();

vi.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

vi.mock('@/lib/auth/auth-options', () => ({
  authOptions: {},
}));

// ── Mock: Audit logger ───────────────────────────────────────────────────────
const mockLogAuditAction = vi.fn().mockResolvedValue({});

vi.mock('@/lib/audit', () => ({
  logAuditAction: (...args: unknown[]) => mockLogAuditAction(...args),
}));

import { POST } from './route';

// ── Helpers ──────────────────────────────────────────────────────────────────
function makeSession(role: string, id = 'user-abc') {
  return { user: { id, role, email: `${role.toLowerCase()}@tiqri.com` } };
}

describe('POST /api/auth/generate-qr', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no session exists', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const response = await POST();

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 200 and a token for a GlobalAdmin', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('GlobalAdmin'));

    const response = await POST();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('token');
    expect(typeof body.token).toBe('string');
    expect(body.token).toHaveLength(64); // 32 bytes → 64 hex chars
    expect(body.expires_in).toBe(60);

    // Confirm token was stored in Redis
    expect(mockRedisSet).toHaveBeenCalledWith(
      expect.stringMatching(/^qr_link:/),
      expect.stringContaining('"role":"GlobalAdmin"'),
      { ex: 60 },
    );

    // No audit log should be fired for a successful case
    expect(mockLogAuditAction).not.toHaveBeenCalled();
  });

  it.each([
    ['ITOperator'],
    ['FinancialAuditor'],
    ['Employee'],
  ])('returns 403 for role "%s" and logs the attempt', async (role) => {
    mockGetServerSession.mockResolvedValue(makeSession(role));

    const response = await POST();

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toMatch(/Forbidden/i);

    // Redis must NOT have been written to
    expect(mockRedisSet).not.toHaveBeenCalled();

    // An audit log entry must have been created
    expect(mockLogAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'UNAUTHORIZED_QR_GENERATION_ATTEMPT',
        newData: expect.objectContaining({ attemptedByRole: role }),
      }),
    );
  });
});
