import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

import {
  DEFAULT_POST_LOGIN_REDIRECT,
  sanitizeRedirectPath,
} from '@/lib/auth-redirect';
import { getJwtSecretKey } from '@/lib/jwt';
import { logLatency, startLatencyTimer } from '@/lib/latency';

const SESSION_COOKIE_NAME = 'session_token';
type TokenRole = 'GlobalAdmin' | 'ITOperator' | 'FinanceAuditor' | 'Employee';

async function verifyTokenAndRole(token: string) {
  const authTimer = startLatencyTimer();

  try {
    const verified = await jwtVerify(token, getJwtSecretKey());
    const payload = verified.payload as { role?: unknown };

    const role = normalizeTokenRole(payload.role);

    if (!role) {
      throw new Error('Role is missing or invalid in token');
    }

    return { role };
  } finally {
    logLatency({
      scope: 'PROXY AUTH',
      label: 'verify_token_and_role',
      startTime: authTimer,
    });
  }
}

// Session revocation checks run in server actions / RSC data boundaries,
// keeping edge middleware stateless and low-latency.

function normalizeTokenRole(role: unknown): TokenRole | null {
  if (
    role === 'GlobalAdmin' ||
    role === 'ITOperator' ||
    role === 'FinanceAuditor' ||
    role === 'Employee'
  ) {
    return role;
  }

  return null;
}

function getTopLevelSegment(pathname: string) {
  return pathname.split('/').filter(Boolean)[0] ?? null;
}

/*
 * RBAC Matrix (top-level protected route segments):
 * - GlobalAdmin: all routes
 * - ITOperator: all except /settings/* and /financials/*
 * - FinanceAuditor: all except /settings/* and /operations/*
 * - Employee: /dashboard only
 */
function canAccessRoute(role: TokenRole, pathname: string) {
  if (
    pathname === '/' ||
    pathname === '/dashboard' ||
    pathname === '/dashboard/'
  ) {
    return true;
  }

  if (role === 'GlobalAdmin') {
    return true;
  }

  if (role === 'Employee') {
    return false;
  }

  const topLevelSegment = getTopLevelSegment(pathname);
  const isSettingsRoute = topLevelSegment === 'settings';
  const isFinancialsRoute = topLevelSegment === 'financials';
  const isOperationsRoute = topLevelSegment === 'operations';

  if (role === 'ITOperator') {
    return !isSettingsRoute && !isFinancialsRoute;
  }

  // FinanceAuditor
  return !isSettingsRoute && !isOperationsRoute;
}

function getLoginRedirectResponse(request: NextRequest) {
  const loginUrl = new URL('/login', request.url);
  // Preserve the originally requested path so login can send the user back.
  const requestedPath = sanitizeRedirectPath(
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
    DEFAULT_POST_LOGIN_REDIRECT
  );

  loginUrl.searchParams.set('redirectTo', requestedPath);

  return NextResponse.redirect(loginUrl);
}

export async function proxy(request: NextRequest) {
  const requestTimer = startLatencyTimer();
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const { pathname } = request.nextUrl;
  const isProtectedRoute = pathname !== '/login' && pathname !== '/403';
  const isLoginRoute = pathname === '/login';

  try {
    // If the user is trying to access a protected route without a token, kick them to login.
    if (!token && isProtectedRoute) {
      return getLoginRedirectResponse(request);
    }

    let payload: { role: TokenRole } | null = null;

    if (token) {
      try {
        payload = await verifyTokenAndRole(token);
      } catch {
        // Invalid token/session should not bounce on /login.
        const response = isProtectedRoute
          ? getLoginRedirectResponse(request)
          : NextResponse.next();
        response.cookies.delete(SESSION_COOKIE_NAME);
        return response;
      }
    }

    // If the user is already logged in and tries to visit /login, skip it.
    if (token && isLoginRoute) {
      // Respect a preserved redirect target when an authenticated user hits /login.
      const redirectTo = sanitizeRedirectPath(
        request.nextUrl.searchParams.get('redirectTo'),
        DEFAULT_POST_LOGIN_REDIRECT
      );

      return NextResponse.redirect(new URL(redirectTo, request.url));
    }

    if (
      payload &&
      isProtectedRoute &&
      !canAccessRoute(payload.role, pathname)
    ) {
      return NextResponse.redirect(new URL('/403', request.url));
    }

    return NextResponse.next();
  } finally {
    logLatency({
      scope: 'PROXY',
      label: pathname,
      startTime: requestTimer,
    });
  }
}

/*
 * Match all request paths except for the ones starting with:
 * - api (API routes)
 * - _next/static (static files)
 * - _next/image (image optimization files)
 * - favicon.ico (favicon file)
 * - any file path with an extension (public/static assets)
 */
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
