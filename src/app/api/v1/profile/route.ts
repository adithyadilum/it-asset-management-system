import { NextResponse } from 'next/server';
import * as jose from 'jose';
import { db } from '@/db';
import { users, linkedDevices } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { serverEnv } from '@/lib/env';

const MOBILE_SECRET = new TextEncoder().encode(
  serverEnv.MOBILE_JWT_SECRET 
);

/**
 * GET /api/v1/profile
 *
 * Returns the currently authenticated user's profile details.
 */
export async function GET(req: Request) {
  // --- 1. Authenticate via mobile JWT ---
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.slice(7).trim();

  let userId: string;
  try {
    const { payload } = await jose.jwtVerify(token, MOBILE_SECRET);

    // Verify the device is still active (not revoked)
    if (payload.jti) {
      const [device] = await db
        .select({ id: linkedDevices.id, isRevoked: linkedDevices.isRevoked })
        .from(linkedDevices)
        .where(
          and(
            eq(linkedDevices.jwtId, payload.jti),
            eq(linkedDevices.isRevoked, false)
          )
        )
        .limit(1);

      if (!device) {
        return NextResponse.json(
          { error: 'Device has been unlinked. Please re-pair your device.' },
          { status: 401 }
        );
      }
    }

    userId = String(payload.id);
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // --- 2. Fetch User Profile ---
  try {
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ data: user });
  } catch (error) {
    console.error('[GET /api/v1/profile] DB error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
