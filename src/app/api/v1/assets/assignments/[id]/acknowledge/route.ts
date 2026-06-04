import { NextResponse } from 'next/server';
import * as jose from 'jose';
import { db } from '@/db';
import { assetAssignments, linkedDevices } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

if (!process.env.MOBILE_JWT_SECRET) {
  throw new Error('MOBILE_JWT_SECRET environment variable is required');
}
const MOBILE_SECRET = new TextEncoder().encode(process.env.MOBILE_JWT_SECRET);

/**
 * PATCH /api/v1/assets/assignments/[id]/acknowledge
 *
 * Marks an asset assignment as acknowledged by the user.
 * Sets state = 'assigned' and acceptedAt = now().
 *
 * The user must be the assignee — we verify this before updating.
 *
 * Authentication: Bearer JWT (mobile token).
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // --- 1. Authenticate via mobile JWT ---
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.slice(7).trim();

  let userId: string;
  try {
    const { payload } = await jose.jwtVerify(token, MOBILE_SECRET);

    if (!payload.jti) {
      return NextResponse.json(
        { error: 'Invalid token: missing jti' },
        { status: 401 }
      );
    }
    // Verify device is still active (not revoked)
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

    userId = String(payload.id);
  } catch {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // --- 2. Parse assignment ID from route params ---
  const { id } = await params;
  const assignmentId = parseInt(id, 10);
  if (isNaN(assignmentId)) {
    return NextResponse.json(
      { error: 'Invalid assignment ID' },
      { status: 400 }
    );
  }

  // --- 3. Verify the assignment belongs to this user and is pending ---
  try {
    const [assignment] = await db
      .select({
        id: assetAssignments.id,
        state: assetAssignments.state,
        assignedToUserId: assetAssignments.assignedToUserId,
      })
      .from(assetAssignments)
      .where(eq(assetAssignments.id, assignmentId))
      .limit(1);

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    if (assignment.assignedToUserId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (assignment.state !== 'pending approval') {
      return NextResponse.json(
        { error: 'Assignment is not in a pending state' },
        { status: 409 }
      );
    }

    // --- 4. Acknowledge: set state = 'assigned', acceptedAt = now() ---
    await db
      .update(assetAssignments)
      .set({
        state: 'assigned',
        acceptedAt: new Date(),
        acceptanceStatus: 'accepted',
      })
      .where(eq(assetAssignments.id, assignmentId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      `[PATCH /api/v1/assets/assignments/${id}/acknowledge] DB error:`,
      error
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
