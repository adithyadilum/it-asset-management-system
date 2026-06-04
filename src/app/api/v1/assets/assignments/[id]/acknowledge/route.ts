import { NextResponse } from 'next/server';
import * as jose from 'jose';
import { db } from '@/db';
import { assetAssignments, linkedDevices, notificationQueue } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { logAuditActionTx } from '@/lib/audit';

const MOBILE_SECRET = new TextEncoder().encode(
  process.env.MOBILE_JWT_SECRET ||
    'default-fallback-mobile-jwt-secret-key-32bytes-minimum-length-for-hs256'
);

/**
 * POST /api/v1/assets/assignments/[id]/acknowledge
 *
 * Marks an asset assignment as acknowledged by the user.
 * Sets state = 'assigned' and acceptedAt = now().
 *
 * The user must be the assignee — we verify this before updating.
 *
 * Authentication: Bearer JWT (mobile token).
 */
export async function POST(
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

    userId = typeof payload.id === 'string' && payload.id ? payload.id : '';
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

  // --- 3. Acknowledge: set state = 'assigned', acceptedAt = now() in transaction ---
  try {
    await db.transaction(async (tx) => {
      // Perform atomic update checking state, ID, and user ownership
      const [updatedAssignment] = await tx
        .update(assetAssignments)
        .set({
          state: 'assigned',
          acceptedAt: new Date(),
          acceptanceStatus: 'accepted',
        })
        .where(
          and(
            eq(assetAssignments.id, assignmentId),
            eq(assetAssignments.assignedToUserId, userId),
            eq(assetAssignments.state, 'pending approval')
          )
        )
        .returning({ id: assetAssignments.id });

      if (!updatedAssignment) {
        throw new Error('Assignment not found, unauthorized, or not pending approval');
      }

      // Mark notification queue processed
      await tx
        .update(notificationQueue)
        .set({ isProcessed: true })
        .where(
          and(
            eq(notificationQueue.assignmentId, assignmentId),
            eq(notificationQueue.recipientId, userId)
          )
        );

      // Write system audit log
      await logAuditActionTx(tx, {
        entityType: 'asset_assignment',
        entityId: String(assignmentId),
        actionType: 'ASSIGN',
        performedById: userId,
        oldData: null,
        newData: { state: 'assigned', acceptanceStatus: 'accepted' },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Assignment not found, unauthorized, or not pending approval') {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    console.error(
      `[POST /api/v1/assets/assignments/${id}/acknowledge] DB error:`,
      error
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
