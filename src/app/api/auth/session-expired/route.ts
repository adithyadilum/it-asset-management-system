import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import {
  DEFAULT_POST_LOGIN_REDIRECT,
  sanitizeRedirectPath,
} from '@/lib/auth/auth-redirect';
import { sessionCookieNamesToClear } from '@/lib/auth/session-cookie';

/**
 * Ends a session that a Server Component found to be dead, then forwards to
 * the login screen.
 *
 * The whole point of this being a Route Handler is the `Set-Cookie` header:
 * reading the session inside a layout runs the `jwt` callback and learns that
 * Keycloak has rejected the refresh token, but the rotated token it produces
 * is discarded because Server Components cannot write cookies. Only a Route
 * Handler (or the proxy) can, so the layout redirects here and this clears the
 * cookie for real.
 *
 * It establishes no principal of its own: the only request state it reads is
 * the set of cookie *names* to delete, and it grants nothing.
 *
 * Lives under `/api`, which the proxy matcher excludes, so nothing intercepts
 * the request before the cookie is gone.
 */
export async function GET(request: NextRequest) {
  const loginUrl = new URL('/login', request.nextUrl.origin);
  const redirectTo = sanitizeRedirectPath(
    request.nextUrl.searchParams.get('redirectTo'),
    DEFAULT_POST_LOGIN_REDIRECT
  );
  loginUrl.searchParams.set('redirectTo', redirectTo);

  const response = NextResponse.redirect(loginUrl);

  // Matched by prefix so chunked cookies go too -- this session carries three
  // Keycloak tokens and routinely exceeds the 4096-byte single-cookie limit.
  const present = request.cookies.getAll().map((cookie) => cookie.name);
  for (const name of sessionCookieNamesToClear(present)) {
    response.cookies.delete(name);
  }

  return response;
}
