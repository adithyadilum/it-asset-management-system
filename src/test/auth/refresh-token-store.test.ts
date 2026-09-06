/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/db';
import { authOptions } from '@/lib/auth/auth-options';
import { FATAL_REFRESH_ERROR } from '@/lib/auth/session-liveness';

vi.mock('@/lib/audit', () => ({ logAuditAction: vi.fn() }));

vi.mock('@/lib/crypto', () => ({
  encrypt: (value: string) => `cipher(${value})`,
  decrypt: (value: string) => value.replace(/^cipher\((.*)\)$/, '$1'),
}));

vi.mock('@/db', () => ({
  db: {
    query: { users: { findFirst: vi.fn() } },
    transaction: vi.fn(),
    delete: vi.fn(),
  },
}));

const USER_ID = '11111111-2222-3333-4444-555555555555';

/**
 * Stands in for the transaction handle `refreshAccessToken` is given. Only the
 * calls it actually makes are modelled: the advisory lock, the single-row read
 * of `user_refresh_tokens`, and the upsert on success.
 */
function transactionStub(stored: unknown) {
  return {
    execute: vi.fn().mockResolvedValue(undefined),
    select: () => ({
      from: () => ({
        where: () => ({ limit: async () => (stored ? [stored] : []) }),
      }),
    }),
    insert: () => ({
      values: () => ({ onConflictDoUpdate: async () => undefined }),
    }),
  };
}

describe('refreshAccessToken and the refresh-token store', () => {
  const transactionMock = db.transaction as unknown as ReturnType<typeof vi.fn>;
  const deleteMock = db.delete as unknown as ReturnType<typeof vi.fn>;
  const fetchMock = vi.fn();

  const jwt = authOptions.callbacks?.jwt;
  if (!jwt) throw new Error('jwt callback is not defined in authOptions');

  /** A session whose access token expired a minute ago. */
  const expiredToken = () => ({
    id: USER_ID,
    accessToken: 'old-access',
    idToken: 'old-id',
    refreshToken: 'cookie-refresh',
    accessTokenExpires: Date.now() - 60_000,
  });

  const callJwt = (token: ReturnType<typeof expiredToken>) =>
    jwt({ token, account: null } as never);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', fetchMock);
    deleteMock.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
  });

  it('ends the session without calling Keycloak when no token is stored', async () => {
    transactionMock.mockImplementation(async (run: (tx: unknown) => unknown) =>
      run(transactionStub(null))
    );

    const result = await callJwt(expiredToken());

    expect(result.error).toBe(FATAL_REFRESH_ERROR);
    // The cookie still carries a refresh token; the absent row is what decides.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('forgets the stored token once Keycloak rejects it', async () => {
    transactionMock.mockImplementation(async (run: (tx: unknown) => unknown) =>
      run(
        transactionStub({
          userId: USER_ID,
          refreshToken: 'cipher(stored-refresh)',
          accessToken: 'cipher(stored-access)',
          idToken: 'cipher(stored-id)',
          accessTokenExpires: new Date(Date.now() - 60_000),
        })
      )
    );
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({
        error: 'invalid_grant',
        error_description: 'Token is not active',
      }),
    });

    const result = await callJwt(expiredToken());

    expect(result.error).toBe(FATAL_REFRESH_ERROR);
    expect(deleteMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the stored token when the refresh fails transiently', async () => {
    transactionMock.mockImplementation(async (run: (tx: unknown) => unknown) =>
      run(
        transactionStub({
          userId: USER_ID,
          refreshToken: 'cipher(stored-refresh)',
          accessToken: 'cipher(stored-access)',
          idToken: 'cipher(stored-id)',
          accessTokenExpires: new Date(Date.now() - 60_000),
        })
      )
    );
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'temporarily_unavailable' }),
    });

    const result = await callJwt(expiredToken());

    expect(result.error).toBeUndefined();
    expect(result.refreshRetryAt).toBeGreaterThan(Date.now());
    expect(deleteMock).not.toHaveBeenCalled();
  });
});
