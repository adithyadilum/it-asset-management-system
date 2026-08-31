/**
 * When a failed Keycloak refresh should end the session, and when it should
 * simply be retried.
 *
 * The old rule was "one failure ends it, forever". The jwt callback set
 * `error: 'RefreshAccessTokenError'` for any thrown value and then returned
 * early on every later request, so a single timeout against Keycloak -- the
 * refresh call is bounded at 8s, inside a transaction holding an advisory lock,
 * so timeouts are a normal load symptom -- permanently poisoned a session that
 * was otherwise perfectly healthy. Nothing cleared it but a fresh login.
 *
 * That would only be a fair trade if the access token mattered, and it does
 * not: nothing in this app ever calls Keycloak with it. Authorization reads the
 * `users` row on every request (`loadAuthenticatedUser`), and the id token is
 * used once, as the logout hint. So a refresh that fails for a transient reason
 * costs the user nothing and is worth retrying. Only Keycloak positively
 * rejecting the refresh token means the session is really gone.
 */

/** Written to the JWT only when the session cannot be recovered. */
export const FATAL_REFRESH_ERROR = 'RefreshAccessTokenError';

/** How long to leave a transiently-failed refresh alone before trying again. */
export const REFRESH_RETRY_BACKOFF_MS = 30_000;

/**
 * Refresh this far ahead of expiry, so a request is never served on a token
 * that expires mid-flight.
 */
export const REFRESH_BUFFER_MS = 60_000;

/** The shape of the JWT fields this module reasons about. */
export type RefreshState = {
  accessTokenExpires?: number;
  error?: string;
  refreshRetryAt?: number;
};

/**
 * True only for Keycloak's "this refresh token is no longer valid" answer.
 *
 * `invalid_grant` is the one response retrying cannot fix: the token was
 * revoked, or the SSO session behind it ended. Everything else -- a timeout, a
 * 5xx, a DNS blip, even `invalid_client` from a mistyped secret -- is either
 * temporary or an operator error, and signing every user out is the wrong
 * answer to both.
 */
export function isFatalRefreshFailure(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  return (error as { error?: unknown }).error === 'invalid_grant';
}

export type RefreshDecision =
  /** Access token is still good; do nothing. */
  | 'fresh'
  /** Due for a refresh; call Keycloak. */
  | 'refresh'
  /** A recent attempt failed transiently; wait before trying again. */
  | 'backoff'
  /** Keycloak rejected the refresh token; the session is over. */
  | 'give-up';

export function planTokenRefresh(
  token: RefreshState,
  now: number = Date.now()
): RefreshDecision {
  if (token.error === FATAL_REFRESH_ERROR) return 'give-up';

  // A token carrying no usable expiry is treated as due. One wasted refresh
  // beats serving a request on a token of unknown age -- and it matches what
  // the previous `Date.now() < (undefined as number) - BUFFER` comparison did
  // by accident, via NaN.
  if (
    typeof token.accessTokenExpires !== 'number' ||
    Number.isNaN(token.accessTokenExpires)
  ) {
    return 'refresh';
  }

  if (now < token.accessTokenExpires - REFRESH_BUFFER_MS) return 'fresh';
  if (typeof token.refreshRetryAt === 'number' && now < token.refreshRetryAt) {
    return 'backoff';
  }
  return 'refresh';
}

/**
 * Whether the edge proxy should treat this session as dead and bounce to login.
 *
 * Deliberately the only liveness signal the proxy uses. Timestamps in the
 * session cookie are stale by construction: the cookie is rewritten only by
 * NextAuth's own route handlers, and `getServerSession()` inside a Server
 * Component cannot set cookies, so the rotation it performs is computed and
 * thrown away. A proxy that judged liveness from those timestamps signed people
 * out on a deadline that had quietly stopped advancing. This flag is written by
 * the one piece of code that actually asked Keycloak.
 */
export function isSessionUnrecoverable(token: RefreshState): boolean {
  return token.error === FATAL_REFRESH_ERROR;
}
