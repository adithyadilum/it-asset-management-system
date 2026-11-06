import { NextResponse } from 'next/server';
import { logAuditAction } from '@/lib/audit';
import { canAccessMobile } from '@/lib/auth/roles';
import crypto from 'crypto';
import { createPairingStore } from '@/lib/auth/pairing-store';
import { getAuthenticatedUser } from '@/actions/auth';

const redis = createPairingStore();

export async function POST() {
  try {
    const user = await getAuthenticatedUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Pairing is available to GlobalAdmins and IT operators.
    if (!canAccessMobile(user.role)) {
      await logAuditAction({
        entityType: 'linked_devices',
        entityId: user.id,
        actionType: 'UNAUTHORIZED_QR_GENERATION_ATTEMPT',
        performedById: user.id,
        newData: {
          attemptedByRole: user.role,
          reason:
            'An unauthorized role attempted to generate a mobile pairing QR token.',
        },
      });
      return NextResponse.json(
        {
          error:
            'Forbidden: Only Global Administrators and IT Operators can link a mobile device.',
        },
        { status: 403 }
      );
    }

    // Generate a cryptographically secure token
    const linkToken = crypto.randomBytes(32).toString('hex');

    // Store the mapping in Upstash Redis for exactly 60 seconds.
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

    return NextResponse.json(
      { token: linkToken, expires_in: 60 },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json(
      {
        error:
          'The pairing service is temporarily unavailable. Please try again.',
      },
      {
        status: 503,
        headers: { 'Retry-After': '5', 'Cache-Control': 'no-store' },
      }
    );
  }
}
