import { NextResponse, userAgent } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

import {
  DEFAULT_POST_LOGIN_REDIRECT,
  sanitizeRedirectPath,
} from '@/lib/auth/auth-redirect';
import { logLatency, startLatencyTimer } from '@/lib/latency';
import { logAuditAction } from '@/lib/audit';
import { USER_ROLES, type UserRole } from '@/types/auth';
import { canAccessMobile } from '@/lib/auth/roles';

/** Validates an unknown JWT claim against the known role enum. */
function normalizeTokenRole(role: unknown): UserRole | null {
  if (typeof role === 'string' && USER_ROLES.includes(role as UserRole)) {
    return role as UserRole;
  }
  return null;
}

/** Decrypts the JWT cookie and extracts auth metadata (stateless — no Keycloak refresh). */
async function verifyTokenAndRole(request: NextRequest) {
  const authTimer = startLatencyTimer();

  try {
    const token = await getToken({ req: request });

    if (!token) {
      return null;
    }

    const role = normalizeTokenRole(token.role);

    if (!role) {
      return null;
    }

    // Used to decide if we should redirect authenticated users away from /login.
    // We do NOT block access on expiry — the app-shell handles silent refresh.
    // Blocking here would kick users out every ~5 min even with valid refresh tokens.
    const EXPIRY_BUFFER_MS = 30_000;
    const accessTokenExpires = token.accessTokenExpires as number | undefined;
    const isAccessTokenFresh =
      typeof accessTokenExpires === 'number'
        ? Date.now() < accessTokenExpires - EXPIRY_BUFFER_MS
        : true;

    // Both tokens expired — session is unrecoverable, force re-login.
    const refreshTokenExpires = token.refreshTokenExpires as number | undefined;
    if (
      !isAccessTokenFresh &&
      typeof refreshTokenExpires === 'number' &&
      Date.now() > refreshTokenExpires
    ) {
      return null;
    }

    return {
      role,
      sub: token.id as string | undefined,
      isAccessTokenFresh,
      isActive: (token.isActive as boolean) ?? true,
    };
  } finally {
    logLatency({
      scope: 'PROXY AUTH',
      label: 'verify_token_and_role',
      startTime: authTimer,
    });
  }
}

function getTopLevelSegment(pathname: string) {
  return pathname.split('/').filter(Boolean)[0] ?? null;
}

/** Static assets, build output, and metadata files that bypass auth. */
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

/**
 * Edge RBAC gate — controls which top-level route segments each role can reach.
 * GlobalAdmin: all | ITOperator: no /settings, /financials
 * FinancialAuditor: no /settings, limited /operations | Employee: /dashboard only
 */
function canAccessRoute(role: UserRole, pathname: string) {
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

  if (role === 'FinancialAuditor') {
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

/** Redirects to /login with a ?redirectTo param and clears stale session cookies. */
function getLoginRedirectResponse(request: NextRequest) {
  const loginUrl = new URL('/login', request.url);
  const requestedPath = sanitizeRedirectPath(
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
    DEFAULT_POST_LOGIN_REDIRECT
  );

  loginUrl.searchParams.set('redirectTo', requestedPath);
  const response = NextResponse.redirect(loginUrl);

  // Clear stale cookies to prevent redirect loops from broken JWTs.
  const secureCookieName = '__Secure-next-auth.session-token';
  const plainCookieName = 'next-auth.session-token';

  if (request.cookies.has(secureCookieName)) {
    response.cookies.delete(secureCookieName);
  } else if (request.cookies.has(plainCookieName)) {
    response.cookies.delete(plainCookieName);
  }

  return response;
}
/** Main edge proxy — handles auth, RBAC, mobile routing, and account-status gates. */
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
      // Only bounce authenticated users away from /login if their token is fresh.
      // Expired tokens must stay — redirecting would create an infinite loop.
      if (!payload.isAccessTokenFresh) {
        return NextResponse.next();
      }

      const redirectTo = sanitizeRedirectPath(
        request.nextUrl.searchParams.get('redirectTo'),
        DEFAULT_POST_LOGIN_REDIRECT
      );

      return NextResponse.redirect(new URL(redirectTo, request.url));
    }

    // Disabled accounts are always sent to /account-disabled.
    if (payload && !payload.isActive && !isAccountDisabledRoute) {
      return NextResponse.redirect(new URL('/account-disabled', request.url));
    }

    // Re-enabled users shouldn't stay on the disabled page.
    if (payload && payload.isActive && isAccountDisabledRoute) {
      return NextResponse.redirect(
        new URL(DEFAULT_POST_LOGIN_REDIRECT, request.url)
      );
    }

    if (payload && isProtectedRoute) {
      const { device } = userAgent(request);
      const isMobile = device.type === 'mobile';
      const canUseMobile = canAccessMobile(payload.role);

      // Redirect eligible mobile users to /mobile; block desktop or unauthorized roles.
      if (canUseMobile && isMobile && !pathname.startsWith('/mobile')) {
        return NextResponse.redirect(new URL('/mobile', request.url));
      }
      if (pathname.startsWith('/mobile') && (!isMobile || !canUseMobile)) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }

      // Employees don't have a dashboard — send them to /my-assets.
      if (
        payload.role === 'Employee' &&
        (pathname === '/' ||
          pathname === '/dashboard' ||
          pathname === '/dashboard/')
      ) {
        return NextResponse.redirect(new URL('/my-assets', request.url));
      }

      // Log and block unauthorized route access.
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
    // All paths except API routes, static assets, and PWA files.
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons).*)',
  ],
};
