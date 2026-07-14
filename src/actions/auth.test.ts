import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks — must be declared before any imports that depend on them
// ---------------------------------------------------------------------------

const mockGetServerSession = vi.fn();
const mockFindUser = vi.fn();
vi.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

vi.mock('@/lib/auth/auth-options', () => ({
  authOptions: {},
}));

vi.mock('@/db', () => ({
  db: { query: { users: { findFirst: (...args: unknown[]) => mockFindUser(...args) } } },
}));
vi.mock('@/db/schema', () => ({ users: { id: 'users.id' } }));
vi.mock('drizzle-orm', () => ({ eq: vi.fn() }));

const mockLogAuditAction = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/audit', () => ({
  logAuditAction: (...args: unknown[]) => mockLogAuditAction(...args),
}));

vi.mock('@/lib/env', () => ({
  serverEnv: {
    get KEYCLOAK_ISSUER() {
      return process.env.KEYCLOAK_ISSUER;
    },
    get NEXTAUTH_URL() {
      return process.env.NEXTAUTH_URL;
    },
  },
}));

// ---------------------------------------------------------------------------
// Import under test (after mocks are wired)
// ---------------------------------------------------------------------------

import { getAuthenticatedUser, getFederatedLogoutUrl } from '@/actions/auth';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getAuthenticatedUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindUser.mockImplementation(async () => {
      const session = await mockGetServerSession();
      return session?.user
        ? { ...session.user, isActive: session.user.isActive ?? true }
        : null;
    });
  });

  it('returns null when no session exists', async () => {
    mockGetServerSession.mockResolvedValue(null);
    expect(await getAuthenticatedUser()).toBeNull();
  });

  it('returns null when session has RefreshAccessTokenError', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'u1', email: 'a@b.com', name: 'A', role: 'GlobalAdmin' },
      error: 'RefreshAccessTokenError',
    });
    expect(await getAuthenticatedUser()).toBeNull();
  });

  it('returns null when session.user is undefined', async () => {
    mockGetServerSession.mockResolvedValue({ user: undefined });
    expect(await getAuthenticatedUser()).toBeNull();
  });

  it('returns null when session.user.id is missing', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: '', email: 'a@b.com', name: 'A', role: 'GlobalAdmin' },
    });
    expect(await getAuthenticatedUser()).toBeNull();
  });

  it('returns null when session.user.email is empty string', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'u1', email: '', name: 'A', role: 'GlobalAdmin' },
    });
    expect(await getAuthenticatedUser()).toBeNull();
  });

  it('returns null when session.user.name is undefined', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'u1', email: 'a@b.com', name: undefined, role: 'GlobalAdmin' },
    });
    expect(await getAuthenticatedUser()).toBeNull();
  });

  it('returns null when session.user.id is not a string', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 123, email: 'a@b.com', name: 'A', role: 'GlobalAdmin' },
    });
    expect(await getAuthenticatedUser()).toBeNull();
  });

  it('returns a valid AuthenticatedUser for a complete session', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'u1', email: 'a@b.com', name: 'Admin', role: 'GlobalAdmin' },
    });

    const user = await getAuthenticatedUser();
    expect(user).toEqual({
      id: 'u1',
      email: 'a@b.com',
      name: 'Admin',
      role: 'GlobalAdmin',
      isActive: true,
    });
  });

  it('normalizes an unrecognized role string to Employee', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'u1', email: 'a@b.com', name: 'A', role: 'SuperUser' },
    });

    const user = await getAuthenticatedUser();
    expect(user?.role).toBe('Employee');
  });

  it('normalizes null role to Employee', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'u1', email: 'a@b.com', name: 'A', role: null },
    });

    const user = await getAuthenticatedUser();
    expect(user?.role).toBe('Employee');
  });

  it('normalizes undefined role to Employee', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'u1', email: 'a@b.com', name: 'A', role: undefined },
    });

    const user = await getAuthenticatedUser();
    expect(user?.role).toBe('Employee');
  });

  it.each(['GlobalAdmin', 'ITOperator', 'FinancialAuditor', 'Employee'] as const)(
    'preserves %s role exactly',
    async (role) => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'u1', email: 'a@b.com', name: 'A', role },
      });

      const user = await getAuthenticatedUser();
      expect(user?.role).toBe(role);
    }
  );
});

describe('getFederatedLogoutUrl', () => {
  const KEYCLOAK_ISSUER = 'https://keycloak.example.com/realms/test';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.KEYCLOAK_ISSUER = KEYCLOAK_ISSUER;
    process.env.NEXTAUTH_URL = 'https://app.tiqri.com';
  });

  it('constructs correct Keycloak end-session URL', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'u1', email: 'a@b.com' },
      idToken: 'test-id-token',
    });

    const url = await getFederatedLogoutUrl();
    expect(url).toContain(`${KEYCLOAK_ISSUER}/protocol/openid-connect/logout`);
    expect(url).toContain('id_token_hint=test-id-token');
  });

  it('logs audit LOGOUT action when session exists', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'u1', email: 'a@b.com' },
      idToken: 'tok',
    });

    await getFederatedLogoutUrl();

    expect(mockLogAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'LOGOUT',
        entityType: 'sessions',
        performedById: 'u1',
      })
    );
  });

  it('uses NEXTAUTH_URL env for redirect URI', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'u1', email: 'a@b.com' },
      idToken: 'tok',
    });

    const url = await getFederatedLogoutUrl();
    expect(url).toContain(encodeURIComponent('https://app.tiqri.com/login'));
  });

  it('falls back to localhost when NEXTAUTH_URL is unset', async () => {
    delete process.env.NEXTAUTH_URL;

    mockGetServerSession.mockResolvedValue({
      user: { id: 'u1', email: 'a@b.com' },
      idToken: 'tok',
    });

    const url = await getFederatedLogoutUrl();
    expect(url).toContain(encodeURIComponent('http://localhost:3000/login'));
  });
});
