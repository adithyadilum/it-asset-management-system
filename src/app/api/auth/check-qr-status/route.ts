import { withRateLimit } from '@/lib/api/with-rate-limit';
import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { serverEnv } from '@/lib/env';

const redis = new Redis({
  url: serverEnv.UPSTASH_REDIS_REST_URL,
  token: serverEnv.UPSTASH_REDIS_REST_TOKEN,
});

export const GET = withRateLimit('qr-status', async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
    return NextResponse.json({ claimed: false }, { status: 400 });
  }

  // Check for the explicit "claimed" marker set by the mobile-exchange endpoint.
  // This avoids the false-positive bug where an expired token (key deleted by TTL)
  // was indistinguishable from a claimed token (key deleted by exchange).
  const claimed = await redis.exists(`qr_claimed:${token}`);

  return NextResponse.json({ claimed: claimed === 1 });
});
