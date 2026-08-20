import { NextResponse } from 'next/server';

import {
  applyRateLimit,
  injectRateLimitHeaders,
  isRateLimitConfigured,
} from '@/lib/api/rate-limiter';

/**
 * Resolves the client IP, preferring the header the hosting platform controls.
 *
 * `x-forwarded-for` is client-settable when the app is reached directly, so the
 * platform header is trusted first — the same order `withApiKey` uses.
 */
function resolveClientIp(req: Request): string {
  const platformForwardedFor = req.headers.get('x-vercel-forwarded-for');
  const forwardedFor =
    platformForwardedFor || req.headers.get('x-forwarded-for');
  const firstIp = forwardedFor ? forwardedFor.split(',')[0].trim() : '';
  return firstIp || req.headers.get('x-real-ip') || 'unknown';
}

/**
 * Applies a sliding-window limit to a route, keyed by bucket and client IP.
 *
 * Compose it outside the auth wrapper so an unauthenticated flood is rejected
 * before any session lookup or database read:
 *
 *     export const GET = withRateLimit('search', withAuth(allowAnyRole, handler));
 *
 * When Upstash Redis is not configured the limiter is skipped rather than
 * failing the request. That only happens in development — production
 * configuration is enforced at boot by `assertProductionEnv`.
 */
export function withRateLimit<TReq extends Request, TArgs extends unknown[]>(
  bucket: string,
  handler: (req: TReq, ...rest: TArgs) => Promise<Response>
) {
  return async (req: TReq, ...rest: TArgs): Promise<Response> => {
    if (!isRateLimitConfigured()) {
      return handler(req, ...rest);
    }

    let result;
    try {
      result = await applyRateLimit(`${bucket}:${resolveClientIp(req)}`);
    } catch (error) {
      // A limiter outage must not take the application down with it.
      console.error(`[rate-limit] ${bucket} check failed:`, error);
      return handler(req, ...rest);
    }

    if (!result.success) {
      return injectRateLimitHeaders(
        NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 }),
        result
      );
    }

    const response = await handler(req, ...rest);
    return injectRateLimitHeaders(response as NextResponse, result);
  };
}
