import { NextResponse } from 'next/server';
import { db } from '@/db';
import { assetAssignments, notificationQueue } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { logAuditActionTx } from '@/lib/audit';
import { getAuthenticatedMobileUserFromRequest } from '@/lib/auth/get-authenticated-user';

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
  const user = await getAuthenticatedMobileUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = user.id;

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
