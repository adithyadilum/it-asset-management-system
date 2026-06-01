import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { Redis } from '@upstash/redis';
import crypto from 'crypto';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Generate a cryptographically secure token
  const linkToken = crypto.randomBytes(32).toString('hex');

  // Store the mapping in Upstash Redis for exactly 60 seconds
  // Include a status field so check-qr-status can distinguish pending vs claimed vs expired
  try {
    await redis.set(`qr_link:${linkToken}`, JSON.stringify({
      id: user.id,
      role: user.role,
      email: user.email,
      status: 'pending',
    }), { ex: 60 });
  } catch (error) {
    return NextResponse.json({ error: 'Redis error' }, { status: 500 });
  }
  return NextResponse.json({ token: linkToken, expires_in: 60 });
}