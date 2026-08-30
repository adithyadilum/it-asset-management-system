import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { serverEnv } from '@/lib/env';

let ratelimitInstance: Ratelimit | null = null;

/**
 * Whether Upstash credentials are present.
 *
 * `Redis.fromEnv()` throws when they are not, so callers that must not fail the
 * request check this first. Production always has them — `assertProductionEnv`
 * refuses to start the server otherwise.
 */
export function isRateLimitConfigured(): boolean {
  return Boolean(
    serverEnv.UPSTASH_REDIS_REST_URL && serverEnv.UPSTASH_REDIS_REST_TOKEN
  );
}
let preAuthRateLimitInstance: Ratelimit | null = null;

export function getRateLimiter(): Ratelimit {
  if (!ratelimitInstance) {
    const redis = Redis.fromEnv();
    ratelimitInstance = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        serverEnv.API_RATE_LIMIT_MAX,
        `${serverEnv.API_RATE_LIMIT_WINDOW_SECONDS} s`
      ),
      analytics: true,
      prefix: 'eitams:ratelimit',
    });
  }
  return ratelimitInstance;
}

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

export async function applyRateLimit(
  identifier: string
): Promise<RateLimitResult> {
  const limiter = getRateLimiter();
  const res = await limiter.limit(identifier);

  // upstash result fields vary; normalize to our shape
  const limit = Number(res.limit ?? serverEnv.API_RATE_LIMIT_MAX);
  const remaining = Number(res.remaining ?? 0);
  const reset = Math.floor(Number(res.reset ?? 0) / 1000); // seconds

  return {
    success: res.success ?? remaining > 0,
    limit,
    remaining,
    reset,
  };
}

export async function applyPreAuthRateLimit(
  identifier: string
): Promise<RateLimitResult> {
  if (!preAuthRateLimitInstance) {
    preAuthRateLimitInstance = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(
        Math.min(serverEnv.API_RATE_LIMIT_MAX, 20),
        `${serverEnv.API_RATE_LIMIT_WINDOW_SECONDS} s`
      ),
      analytics: true,
      prefix: 'eitams:ratelimit:preauth',
    });
  }

  const res = await preAuthRateLimitInstance.limit(identifier);
  return {
    success: res.success,
    limit: Number(res.limit ?? 20),
    remaining: Number(res.remaining ?? 0),
    reset: Math.floor(Number(res.reset ?? 0) / 1000),
  };
}

import type { NextResponse } from 'next/server';

export function injectRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
) {
  try {
    response.headers.set('X-RateLimit-Limit', String(result.limit));
    response.headers.set('X-RateLimit-Remaining', String(result.remaining));
    response.headers.set('X-RateLimit-Reset', String(result.reset));
  } catch {
    // best-effort, ignore
  }

  return response;
}
