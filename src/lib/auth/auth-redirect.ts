export const DEFAULT_POST_LOGIN_REDIRECT = '/dashboard';

export function sanitizeRedirectPath(
  candidate: string | null | undefined,
  fallback = DEFAULT_POST_LOGIN_REDIRECT
) {
  // Fallback when no redirect target is provided.
  if (!candidate) {
    return fallback;
  }

  const value = candidate.trim();

  // Allow only same-origin internal paths.
  if (!value.startsWith('/')) {
    return fallback;
  }

  // Prevent protocol-relative redirects and login loops.
  if (value.startsWith('//') || value.startsWith('/login')) {
    return fallback;
  }

  return value;
}

/**
 * Where a Server Component sends a user whose session has expired.
 *
 * Not `/login` directly. The session cookie is the only thing the proxy judges
 * liveness from, and a Server Component cannot write cookies -- so a render
 * that discovers a dead session can redirect, but cannot clear the evidence
 * that made the proxy think the session was fine. Sending the user straight to
 * `/login` therefore bounced them back: the proxy saw an intact cookie and
 * redirected `/login` to `/dashboard`, whose layout discovered the dead session
 * all over again.
 *
 * This route is a Route Handler, which can set cookies. It clears them and
 * then forwards to `/login`, which the proxy now leaves alone.
 */
export const SESSION_EXPIRED_PATH = '/api/auth/session-expired';
