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
import { isPublicAssetPath } from '@/lib/auth/public-paths';
import { isSessionUnrecoverable } from '@/lib/auth/session-liveness';
import { sessionCookieNamesToClear } from '@/lib/auth/session-cookie';

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

    // The only liveness test here, and deliberately not a timestamp one.
    //
    // This used to compare `accessTokenExpires` against a `refreshTokenExpires`
    // deadline read from the cookie, which signed people out roughly 30 minutes
    // after login: that deadline was stamped once at sign-in and nothing
    // advanced it. The cookie is rewritten only by NextAuth's own route
    // handlers, and `getServerSession()` inside a Server Component cannot set
    // cookies, so every rotation performed during a page render was computed
    // and thrown away. Keycloak's own SSO session stayed alive throughout --
    // which is why the bounce back through /login never asked for a password.
    if (isSessionUnrecoverable(token)) {
      return null;
    }

    return {
      role,
      sub: token.id as string | undefined,
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

  // Clear stale cookies to prevent redirect loops from broken JWTs. Matched by
  // prefix so chunked cookies go too -- see `sessionCookieNamesToClear`.
  const present = request.cookies.getAll().map((cookie) => cookie.name);
  for (const name of sessionCookieNamesToClear(present)) {
    response.cookies.delete(name);
  }

  return response;
}
/**
 * Nonce-based CSP, emitted in report-only mode (SEC-G).
 *
 * The enforced policy in next.config.ts still carries `script-src 'unsafe-inline'`,
 * which nullifies most of CSP's XSS value. This header runs the stricter policy
 * alongside it so violations surface in the browser console without breaking
 * anything. Next.js streaming injects scripts, so promoting this to the
 * enforced `Content-Security-Policy` header requires verifying that path in a
 * real browser first. (Serwist was named here too, but the PWA was never wired
 * up and the packages have since been removed.)
 */
function buildNoncePolicy(nonce: string) {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    // Matches the enforced policy: without it this report-only policy would
    // flag every PDF render as a violation that the enforced policy allows.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'`,
    // Tailwind emits inline style attributes; these are not a script vector.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https: wss:",
    "worker-src 'self' blob:",
  ].join('; ');
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
      // No freshness test guards this any more. The loop it protected against
      // was only reachable while the gate above could reject a session that
      // `getToken` had accepted; both now answer from the same flag, so a
      // payload here means the session is usable and the user does not belong
      // on the login page.
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

    // Forwarded so server components can attach the nonce to any script they
    // render once the policy is enforced.
    const nonce = crypto.randomUUID().replace(/-/g, '');
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-nonce', nonce);

    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    response.headers.set(
      'Content-Security-Policy-Report-Only',
      buildNoncePolicy(nonce)
    );
    return response;
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
