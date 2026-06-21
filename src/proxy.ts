import { NextResponse, userAgent } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

import {
  DEFAULT_POST_LOGIN_REDIRECT,
  sanitizeRedirectPath,
} from '@/lib/auth/auth-redirect';
import { logLatency, startLatencyTimer } from '@/lib/latency';
import { logAuditAction } from '@/lib/audit';
import type { UserRole } from '@/types/auth';

type TokenRole = UserRole;

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

async function verifyTokenAndRole(request: NextRequest) {
  const authTimer = startLatencyTimer();

  try {
    // getToken() decrypts the JWT cookie but does NOT call the jwt callback
    // and does NOT attempt a Keycloak token refresh. It returns the raw
    // cookie payload. This keeps the proxy stateless and low-latency.
    const token = await getToken({ req: request });

    if (!token) {
      return null;
    }

    const role = normalizeTokenRole(token.role);

    if (!role) {
      return null;
    }

    // ── Determine whether the access token is still fresh ────────────────────
    // accessTokenExpires is milliseconds-since-epoch stored in the JWT cookie.
    // We do NOT block access here — getServerSession() in the app-shell layout
    // will attempt a silent refresh via the jwt() callback when the access
    // token is expired. Blocking here would kick the user out every 5 minutes
    // (the typical Keycloak access token lifetime) even when the refresh token
    // is still perfectly valid.
    //
    // What we DO use this flag for: deciding whether to redirect an already-
    // authenticated user AWAY from /login. We only bounce them if the access
    // token is still fresh — if it's expired we let them stay on /login so
    // that the app-shell's failed-refresh → redirect("/login") flow lands
    // cleanly without bouncing back and creating the redirect loop.
    const EXPIRY_BUFFER_MS = 30 * 1000; // 30-second safety margin
    const accessTokenExpires = token.accessTokenExpires as number | undefined;
    const isAccessTokenFresh =
      typeof accessTokenExpires === 'number'
        ? Date.now() < accessTokenExpires - EXPIRY_BUFFER_MS
        : true; // no expiry stored → assume fresh (legacy token)

    // ── Detect truly dead sessions ────────────────────────────────────────────
    // refreshTokenExpires is stored in the JWT when auth-options.ts is updated
    // to persist it. If both the access token AND the refresh token are past
    // their expiry, there is no way to recover the session silently. We return
    // null so the caller clears the cookie and sends the user to /login.
    const refreshTokenExpires = token.refreshTokenExpires as number | undefined;
    if (
      !isAccessTokenFresh &&
      typeof refreshTokenExpires === 'number' &&
      Date.now() > refreshTokenExpires
    ) {
      return null;
    }

    return { role, sub: token.id as string | undefined, isAccessTokenFresh, isActive: token.isActive as boolean ?? true };
  } finally {
    logLatency({
      scope: 'PROXY AUTH',
      label: 'verify_token_and_role',
      startTime: authTimer,
    });
  }
}

// Session revocation checks run in server actions / RSC boundaries,
// keeping edge interception stateless and low-latency.

function getTopLevelSegment(pathname: string) {
  return pathname.split('/').filter(Boolean)[0] ?? null;
}

function isPublicAssetPath(pathname: string) {
  return (
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/manifest.json' ||
    /\.[a-z0-9]+$/i.test(pathname)
  );
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
    pathname === '/dashboard/' ||
    pathname === '/my-assets' ||
    pathname.startsWith('/my-assets/')
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

  if (role === 'FinanceAuditor') {
    if (isSettingsRoute) return false;
    if (isOperationsRoute) {
      return (
        pathname.startsWith('/operations/maintenance') ||
        pathname.startsWith('/operations/disposals') ||
        pathname === '/operations'
      );
    }
    return true;
  }

  return true;
}

function getLoginRedirectResponse(request: NextRequest) {
  const loginUrl = new URL('/login', request.url);
  const requestedPath = sanitizeRedirectPath(
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
    DEFAULT_POST_LOGIN_REDIRECT
  );

  loginUrl.searchParams.set('redirectTo', requestedPath);
  const response = NextResponse.redirect(loginUrl);

  // Clear the stale NextAuth session cookie so the browser doesn't keep
  // replaying the broken JWT on every subsequent request, which would
  // re-trigger the RefreshAccessTokenError → redirect loop even after the
  // fix above. Deleting the cookie here gives the user a clean slate and
  // forces NextAuth to issue a fresh sign-in flow.
  const secureCookieName = '__Secure-next-auth.session-token';
  const plainCookieName = 'next-auth.session-token';

  if (request.cookies.has(secureCookieName)) {
    response.cookies.delete(secureCookieName);
  } else if (request.cookies.has(plainCookieName)) {
    response.cookies.delete(plainCookieName);
  }

  return response;
}
export async function proxy(request: NextRequest) {
  const requestTimer = startLatencyTimer();
  const { pathname } = request.nextUrl;
  const isProtectedRoute =
    !isPublicAssetPath(pathname) &&
    pathname !== '/login' &&
    pathname !== '/403' &&
    pathname !== '/account-disabled' &&
    !pathname.startsWith('/api');
  const isLoginRoute = pathname === '/login';
  const isAccountDisabledRoute = pathname === '/account-disabled';

  try {
    const payload = await verifyTokenAndRole(request);

    if (!payload && isProtectedRoute) {
      return getLoginRedirectResponse(request);
    }

    if (payload && isLoginRoute) {
      // Only redirect an already-authenticated user away from /login when the
      // access token is STILL FRESH. If it is expired (but possibly refreshable)
      // we must NOT redirect — the app-shell's failed-refresh path will
      // redirect here anyway, and bouncing them back would create the loop:
      //   /dashboard → refresh fails → /login → proxy bounces → /dashboard → …
      if (!payload.isAccessTokenFresh) {
        // Access token is expired; let /login render. getServerSession() hasn't
        // run yet so we don't know whether the refresh token is still good.
        // If it is, the user just needs to click "Sign in" once — Keycloak
        // will return a fresh session immediately. If it isn't, the sign-in
        // flow will show a proper Keycloak error.
        return NextResponse.next();
      }

      const redirectTo = sanitizeRedirectPath(
        request.nextUrl.searchParams.get('redirectTo'),
        DEFAULT_POST_LOGIN_REDIRECT
      );

      return NextResponse.redirect(new URL(redirectTo, request.url));
    }

    // ── Account-status gate ──────────────────────────────────────────────────
    // If the user's account has been disabled by an admin, send them to the
    // account-disabled page regardless of what route they requested.
    if (payload && !payload.isActive && !isAccountDisabledRoute) {
      return NextResponse.redirect(new URL('/account-disabled', request.url));
    }

    // If a re-enabled user somehow still hits /account-disabled, send them home.
    if (payload && payload.isActive && isAccountDisabledRoute) {
      return NextResponse.redirect(new URL(DEFAULT_POST_LOGIN_REDIRECT, request.url));
    }

    if (payload && isProtectedRoute) {
      const { device } = userAgent(request);
      const isMobile = device.type === 'mobile';
      const isAdmin = payload.role === 'GlobalAdmin' || payload.role === 'ITOperator';

      // Admin mobile routing
      if (isAdmin && isMobile && !pathname.startsWith('/mobile')) {
        return NextResponse.redirect(new URL('/mobile', request.url));
      }

      // Block desktop users or non-admins from accessing /mobile
      if (pathname.startsWith('/mobile')) {
        if (!isMobile || !isAdmin) {
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }
      }

      // Employee Dashboard Redirect
      if (payload.role === 'Employee' && (pathname === '/' || pathname === '/dashboard' || pathname === '/dashboard/')) {
        return NextResponse.redirect(new URL('/my-assets', request.url));
      }

      // Check RBAC
      if (!canAccessRoute(payload.role, pathname)) {
        await logAuditAction({
          entityType: 'URL',
          entityId: request.url,
          actionType: 'ACCESS_DENIED',
          performedById: payload.sub ?? 'SYSTEM',
          newData: { role: payload.role },
        });
        return NextResponse.redirect(new URL('/403', request.url));
      }
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

export const config = {
 matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - manifest.json (PWA manifest)
     * - sw.js (Service Worker)
     * - icons (PWA icons folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons).*)',
  ],
};
