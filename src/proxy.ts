import { NextResponse, userAgent } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

import {
  DEFAULT_POST_LOGIN_REDIRECT,
  sanitizeRedirectPath,
} from '@/lib/auth/auth-redirect';
import { getJwtSecretKey } from '@/lib/auth/jwt';
import { logLatency, startLatencyTimer } from '@/lib/latency';
import {
  normalizeTokenRole,
  SESSION_COOKIE_NAME,
  type TokenRole,
} from '@/lib/auth/session';
import { logAuditAction } from '@/lib/audit';

async function verifyTokenAndRole(token: string) {
  const authTimer = startLatencyTimer();

  try {
    const verified = await jwtVerify(token, getJwtSecretKey());
    const payload = verified.payload as { role?: unknown; sub?: string };

    const role = normalizeTokenRole(payload.role);

    if (!role) {
      throw new Error('Role is missing or invalid in token');
    }

    return { role, sub: payload.sub };
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
  return NextResponse.redirect(loginUrl);
}
export async function proxy(request: NextRequest) {
  const requestTimer = startLatencyTimer();
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const { pathname } = request.nextUrl;
  const isProtectedRoute =
    !isPublicAssetPath(pathname) &&
    pathname !== '/login' &&
    pathname !== '/403' &&
    !pathname.startsWith('/api');
  const isLoginRoute = pathname === '/login';

  try {
    if (!token && isProtectedRoute) {
      return getLoginRedirectResponse(request);
    }

    let payload: { role: TokenRole; sub?: string } | null = null;

    if (token) {
      try {
        payload = await verifyTokenAndRole(token);
      } catch {
        const response = isProtectedRoute
          ? getLoginRedirectResponse(request)
          : NextResponse.next();
        response.cookies.delete(SESSION_COOKIE_NAME);
        return response;
      }
    }

    if (token && isLoginRoute) {
      const redirectTo = sanitizeRedirectPath(
        request.nextUrl.searchParams.get('redirectTo'),
        DEFAULT_POST_LOGIN_REDIRECT
      );

      return NextResponse.redirect(new URL(redirectTo, request.url));
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
