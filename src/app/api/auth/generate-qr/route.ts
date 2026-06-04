import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { Redis } from '@upstash/redis';
import { logAuditAction } from '@/lib/audit';
import { isGlobalAdmin } from '@/lib/auth/roles';
import crypto from 'crypto';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // RBAC: Only GlobalAdmin may generate a mobile pairing QR token.
  if (!isGlobalAdmin(user.role)) {
    await logAuditAction({
      entityType: 'linked_devices',
      entityId: user.id,
      actionType: 'UNAUTHORIZED_QR_GENERATION_ATTEMPT',
      performedById: user.id,
      newData: {
        attemptedByRole: user.role,
        reason: 'Non-admin user attempted to generate a mobile pairing QR token.',
      },
    });
    return NextResponse.json(
      { error: 'Forbidden: Only Global Administrators can link a mobile device.' },
      { status: 403 },
    );
  }

  // Generate a cryptographically secure token
  const linkToken = crypto.randomBytes(32).toString('hex');

  // Store the mapping in Upstash Redis for exactly 60 seconds.
  // Include a status field so check-qr-status can distinguish pending vs claimed vs expired.
  try {
    await redis.set(`qr_link:${linkToken}`, JSON.stringify({
      id: user.id,
      role: user.role,
      email: user.email,
      status: 'pending',
    }), { ex: 60 });
  } catch (_error) {
    return NextResponse.json({ error: 'Redis error' }, { status: 500 });
  }

  return NextResponse.json({ token: linkToken, expires_in: 60 });
}