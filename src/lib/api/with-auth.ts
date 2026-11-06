import { NextResponse, type NextRequest } from 'next/server';

import {
  getAuthenticatedMobileUserFromRequest,
  getAuthenticatedUser,
  getAuthenticatedUserFromRequest,
} from '@/lib/auth/get-authenticated-user';
import type {
  AuthenticatedMobileUser,
  AuthenticatedUser,
} from '@/lib/auth/get-authenticated-user';
import type { UserRole } from '@/types/auth';
import {
  isServiceUnavailable,
  warnDatabaseUnavailable,
} from '@/lib/database-recovery';
import { SERVICE_UNAVAILABLE_MESSAGE } from '@/lib/service-availability';

async function withAvailability(
  run: () => Promise<Response>
): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    if (!isServiceUnavailable(error)) throw error;
    warnDatabaseUnavailable(error);
    return NextResponse.json(
      { error: SERVICE_UNAVAILABLE_MESSAGE, code: 'SERVICE_UNAVAILABLE' },
      {
        status: 503,
        headers: { 'Retry-After': '5', 'Cache-Control': 'no-store' },
      }
    );
  }
}

export type RolePredicate = (role: UserRole) => boolean;

/**
 * Explicit opt-in for routes that intentionally serve every authenticated role.
 *
 * Route handlers must always name a predicate, so "any role may call this" is a
 * visible, greppable decision rather than a check somebody forgot to write.
 * SEC-A and SEC-B were both omissions of exactly that kind.
 */
export const allowAnyRole: RolePredicate = () => true;

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

function withUser<TCtx, TUser>(ctx: TCtx, user: TUser) {
  return { ...((ctx ?? {}) as object), user } as TCtx & { user: TUser };
}

/**
 * Accepts either a web session cookie or a mobile bearer token.
 * Use for endpoints both the browser app and the companion app call.
 */
export function withAuth<TCtx = unknown>(
  predicate: RolePredicate,
  handler: (
    req: NextRequest,
    ctx: TCtx & { user: AuthenticatedUser }
  ) => Promise<Response>
) {
  return async (req: NextRequest, ctx: TCtx): Promise<Response> => {
    return withAvailability(async () => {
      const user = await getAuthenticatedUserFromRequest(req);
      if (!user) return unauthorized();
      if (!predicate(user.role)) return forbidden();
      return handler(req, withUser(ctx, user));
    });
  };
}

/**
 * Mobile bearer token only. Rejects web session cookies.
 * The principal carries `deviceId` and `jwtId` for device-scoped operations.
 */
export function withMobileAuth<TCtx = unknown>(
  predicate: RolePredicate,
  handler: (
    req: NextRequest,
    ctx: TCtx & { user: AuthenticatedMobileUser }
  ) => Promise<Response>
) {
  return async (req: NextRequest, ctx: TCtx): Promise<Response> => {
    return withAvailability(async () => {
      const user = await getAuthenticatedMobileUserFromRequest(req);
      if (!user) return unauthorized();
      if (!predicate(user.role)) return forbidden();
      return handler(req, withUser(ctx, user));
    });
  };
}

/**
 * Web session cookie only. Rejects mobile bearer tokens.
 * Use for browser-only surfaces such as settings and device pairing.
 */
export function withSessionAuth<TCtx = unknown>(
  predicate: RolePredicate,
  handler: (
    req: NextRequest,
    ctx: TCtx & { user: AuthenticatedUser }
  ) => Promise<Response>
) {
  return async (req: NextRequest, ctx: TCtx): Promise<Response> => {
    return withAvailability(async () => {
      const user = await getAuthenticatedUser();
      if (!user) return unauthorized();
      if (!predicate(user.role)) return forbidden();
      return handler(req, withUser(ctx, user));
    });
  };
}
