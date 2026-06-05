import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) return NextResponse.json({ claimed: false });

  // Check for the explicit "claimed" marker set by the mobile-exchange endpoint.
  // This avoids the false-positive bug where an expired token (key deleted by TTL)
  // was indistinguishable from a claimed token (key deleted by exchange).
  const claimed = await redis.exists(`qr_claimed:${token}`);

  return NextResponse.json({ claimed: claimed === 1 });
}