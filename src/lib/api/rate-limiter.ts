import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { API_RATE_LIMIT_MAX, API_RATE_LIMIT_WINDOW_SECONDS } from '@/lib/constants'

const redis = Redis.fromEnv()

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(API_RATE_LIMIT_MAX, `${API_RATE_LIMIT_WINDOW_SECONDS} s`),
  analytics: true,
  prefix: 'eitams:ratelimit',
})

export type RateLimitResult = {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

export async function applyRateLimit(identifier: string): Promise<RateLimitResult> {
  const res = await ratelimit.limit(identifier)

  // upstash result fields vary; normalize to our shape
  const limit = Number(res.limit ?? API_RATE_LIMIT_MAX)
  const remaining = Number(res.remaining ?? 0)
  const reset = Math.floor(Number(res.reset ?? 0) / 1000) // seconds

  return {
    success: res.success ?? remaining > 0,
    limit,
    remaining,
    reset,
  }
}

import type { NextResponse } from 'next/server'

export function injectRateLimitHeaders(response: NextResponse, result: RateLimitResult) {
  try {
    response.headers.set('X-RateLimit-Limit', String(result.limit))
    response.headers.set('X-RateLimit-Remaining', String(result.remaining))
    response.headers.set('X-RateLimit-Reset', String(result.reset))
  } catch {
    // best-effort, ignore
  }

  return response
}

export default ratelimit
