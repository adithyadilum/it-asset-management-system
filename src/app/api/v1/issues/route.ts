import { NextResponse } from 'next/server';
import { db } from '@/db';
import { maintenanceTickets, assets, assetAssignments, systemAuditLogs } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/get-authenticated-user';

export async function POST(req: Request) {
  const user = await getAuthenticatedUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = user.id;

  // --- 4. Execute Business Logic ---
  try {
    const body = await req.json();
    const { assetId, issueNote } = body;

    if (!assetId || !issueNote) {
      return NextResponse.json({ error: 'assetId and issueNote are required' }, { status: 400 });
    }

    const result = await db.transaction(async (tx) => {
      // Fetch the asset
      const [currentAsset] = await tx
        .select()
        .from(assets)
        .where(eq(assets.id, assetId))
        .limit(1);

      if (!currentAsset) {
        throw new Error('Asset not found');
      }

      const now = new Date();

      // Create internal maintenance ticket (this puts it in Pending Review)
      const [newTicket] = await tx.insert(maintenanceTickets).values({
        assetId: currentAsset.id,
        ticketType: 'INTERNAL',
        reportedIssue: issueNote,
        status: 'ACTIVE',
        dispatchedById: userId,
        createdAt: now,
        updatedAt: now,
      }).returning();

      if (!newTicket) {
        throw new Error('Failed to create maintenance ticket');
      }

      // Update asset status to 'In Repair' (removing it from 'Available' assignments grid)
      await tx
        .update(assets)
        .set({ status: 'In Repair', updatedAt: now })
        .where(eq(assets.id, currentAsset.id));

      // Terminate any active assignments since the asset is now In Repair
      await tx
        .update(assetAssignments)
        .set({ returnedDate: now })
        .where(
          and(
            eq(assetAssignments.assetId, currentAsset.id),
            isNull(assetAssignments.returnedDate)
          )
        );

      // Log the audit action
      await tx.insert(systemAuditLogs).values({
        entityType: 'Asset',
        entityId: currentAsset.id,
        actionType: 'UPDATE',
        performedById: userId,
        oldValue: { status: currentAsset.status },
        newValue: {
          status: 'In Repair',
          actionContext: 'ISSUE_REPORTED_FROM_MOBILE',
          issueNote: issueNote,
        },
        performedAt: now,
      });

      return {
        success: true,
        message: 'Issue reported successfully',
        ticketId: newTicket.id,
      };
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error reporting issue:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
