import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { logAuditAction } from '@/lib/audit';
import { isGlobalAdmin } from '@/lib/auth/roles';
import crypto from 'crypto';
import { serverEnv } from '@/lib/env';
import { getAuthenticatedUser } from '@/actions/auth';

const redis = new Redis({
  url: serverEnv.UPSTASH_REDIS_REST_URL,
  token: serverEnv.UPSTASH_REDIS_REST_TOKEN,
});

export async function POST() {
  const user = await getAuthenticatedUser();
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // RBAC: Only GlobalAdmin may generate a mobile pairing QR token.
  if (!isGlobalAdmin(user.role)) {
    await logAuditAction({
      entityType: 'linked_devices',
      entityId: user.id,
      actionType: 'UNAUTHORIZED_QR_GENERATION_ATTEMPT',
      performedById: user.id,
      newData: {
        attemptedByRole: user.role,
        reason:
          'Non-admin user attempted to generate a mobile pairing QR token.',
      },
    });
    return NextResponse.json(
      {
        error:
          'Forbidden: Only Global Administrators can link a mobile device.',
      },
      { status: 403 }
    );
  }

  // Generate a cryptographically secure token
  const linkToken = crypto.randomBytes(32).toString('hex');

  // Store the mapping in Upstash Redis for exactly 60 seconds.
  // Include a status field so check-qr-status can distinguish pending vs claimed vs expired.
  try {
    await redis.set(
      `qr_link:${linkToken}`,
      JSON.stringify({
        id: user.id,
        role: user.role,
        email: user.email,
        status: 'pending',
      }),
      { ex: 60 }
    );
  } catch {
    return NextResponse.json({ error: 'Redis error' }, { status: 500 });
  }

  return NextResponse.json({ token: linkToken, expires_in: 60 });
}
