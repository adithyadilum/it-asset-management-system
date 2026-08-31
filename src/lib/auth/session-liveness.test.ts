import { describe, expect, it } from 'vitest';

import {
  FATAL_REFRESH_ERROR,
  isFatalRefreshFailure,
  isSessionUnrecoverable,
  planTokenRefresh,
  REFRESH_BUFFER_MS,
  REFRESH_RETRY_BACKOFF_MS,
} from './session-liveness';

const NOW = 1_800_000_000_000;

describe('isFatalRefreshFailure', () => {
  it('treats only invalid_grant as fatal', () => {
    expect(isFatalRefreshFailure({ error: 'invalid_grant' })).toBe(true);
  });

  it('does not end the session for a timeout', () => {
    // AbortSignal.timeout rejects with a DOMException, which carries no
    // `error` field. The refresh call is bounded at 8s while holding an
    // advisory lock, so this is a normal load symptom -- not a dead session.
    const timeout = new Error('The operation was aborted due to timeout');
    timeout.name = 'TimeoutError';
    expect(isFatalRefreshFailure(timeout)).toBe(false);
  });

  it('does not end the session for a server-side or operator error', () => {
    // invalid_client means a mistyped secret. Retrying will not fix it, but
    // signing every user out is not the right answer to a config mistake.
    expect(isFatalRefreshFailure({ error: 'invalid_client' })).toBe(false);
    expect(isFatalRefreshFailure({ error: 'temporarily_unavailable' })).toBe(
      false
    );
  });

  it('handles values that are not error objects at all', () => {
    expect(isFatalRefreshFailure(null)).toBe(false);
    expect(isFatalRefreshFailure(undefined)).toBe(false);
    expect(isFatalRefreshFailure('invalid_grant')).toBe(false);
  });
});

describe('planTokenRefresh', () => {
  it('leaves a token alone while it is still fresh', () => {
    expect(
      planTokenRefresh({ accessTokenExpires: NOW + 5 * 60_000 }, NOW)
    ).toBe('fresh');
  });

  it('refreshes inside the pre-expiry buffer, before the token actually dies', () => {
    expect(
      planTokenRefresh({ accessTokenExpires: NOW + REFRESH_BUFFER_MS / 2 }, NOW)
    ).toBe('refresh');
  });

  it('refreshes an already-expired token', () => {
    expect(planTokenRefresh({ accessTokenExpires: NOW - 1 }, NOW)).toBe(
      'refresh'
    );
  });

  it('treats a token with no recorded expiry as due', () => {
    expect(planTokenRefresh({}, NOW)).toBe('refresh');
    expect(planTokenRefresh({ accessTokenExpires: NaN }, NOW)).toBe('refresh');
  });

  it('waits out the backoff after a transient failure', () => {
    const token = {
      accessTokenExpires: NOW - 1,
      refreshRetryAt: NOW + REFRESH_RETRY_BACKOFF_MS,
    };
    expect(planTokenRefresh(token, NOW)).toBe('backoff');
  });

  it('retries once the backoff has elapsed', () => {
    // The bug this replaces: a single transient failure set the error flag and
    // the callback then returned early forever, so the session could never
    // recover no matter how healthy Keycloak became.
    const token = { accessTokenExpires: NOW - 1, refreshRetryAt: NOW - 1 };
    expect(planTokenRefresh(token, NOW)).toBe('refresh');
  });

  it('does not sit in backoff while the token is still fresh', () => {
    const token = {
      accessTokenExpires: NOW + 5 * 60_000,
      refreshRetryAt: NOW + REFRESH_RETRY_BACKOFF_MS,
    };
    expect(planTokenRefresh(token, NOW)).toBe('fresh');
  });

  it('gives up only once Keycloak has rejected the refresh token', () => {
    expect(
      planTokenRefresh(
        { accessTokenExpires: NOW + 5 * 60_000, error: FATAL_REFRESH_ERROR },
        NOW
      )
    ).toBe('give-up');
  });
});

describe('isSessionUnrecoverable', () => {
  it('is false for a healthy session however stale its timestamps are', () => {
    // The whole point of the change: the proxy must not infer death from
    // timestamps, because the cookie holding them is stale by construction.
    expect(
      isSessionUnrecoverable({ accessTokenExpires: NOW - 30 * 24 * 3_600_000 })
    ).toBe(false);
  });

  it('is false while a transient failure is being retried', () => {
    expect(isSessionUnrecoverable({ refreshRetryAt: NOW + 30_000 })).toBe(
      false
    );
  });

  it('is true once the refresh has been definitively rejected', () => {
    expect(isSessionUnrecoverable({ error: FATAL_REFRESH_ERROR })).toBe(true);
  });
});
