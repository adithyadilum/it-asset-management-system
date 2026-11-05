import 'server-only';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  assets,
  assetAssignments,
  maintenanceTickets,
  systemAuditLogs,
} from '@/db/schema';

export class MobileIssueError extends Error {
  constructor(
    message: string,
    readonly status: 404 | 409
  ) {
    super(message);
  }
}

/** Caller must authorize asset-management access before entering this command.
 * Locking the asset serializes retries and concurrent reports for one asset.
 */
export async function recordMobileIssue(
  input: { assetId: string; issueNote: string },
  actorId: string
) {
  return db.transaction(async (tx) => {
    const [asset] = await tx
      .select()
      .from(assets)
      .where(eq(assets.id, input.assetId))
      .limit(1)
      .for('update');
    if (!asset) throw new MobileIssueError('Asset not found.', 404);
    if (asset.isArchived || asset.status === 'Disposed')
      throw new MobileIssueError(
        'Disposed or archived assets cannot be sent for repair.',
        409
      );
    const [open] = await tx
      .select()
      .from(maintenanceTickets)
      .where(
        and(
          eq(maintenanceTickets.assetId, asset.id),
          eq(maintenanceTickets.status, 'ACTIVE')
        )
      )
      .limit(1);
    if (open) {
      if (
        open.ticketType === 'INTERNAL' &&
        open.reportedIssue.trim() === input.issueNote
      )
        return {
          success: true,
          ticketId: open.id,
          message: 'This issue has already been reported.',
        };
      throw new MobileIssueError(
        'This asset already has an open maintenance ticket.',
        409
      );
    }
    const now = new Date();
    const [ticket] = await tx
      .insert(maintenanceTickets)
      .values({
        assetId: asset.id,
        ticketType: 'INTERNAL',
        reportedIssue: input.issueNote,
        status: 'ACTIVE',
        dispatchedById: actorId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    await tx
      .update(assets)
      .set({ status: 'In Repair', updatedAt: now })
      .where(eq(assets.id, asset.id));
    await tx
      .update(assetAssignments)
      .set({
        returnedDate: now,
        state: 'returned',
        acceptanceStatus: sql`CASE WHEN ${assetAssignments.acceptedAt} IS NULL THEN 'cancelled' ELSE ${assetAssignments.acceptanceStatus} END`,
      })
      .where(
        and(
          eq(assetAssignments.assetId, asset.id),
          isNull(assetAssignments.returnedDate)
        )
      );
    await tx.insert(systemAuditLogs).values({
      entityType: 'Asset',
      entityId: asset.id,
      actionType: 'UPDATE',
      performedById: actorId,
      oldValue: { status: asset.status },
      newValue: {
        status: 'In Repair',
        actionContext: 'ISSUE_REPORTED_FROM_MOBILE',
        issueNote: input.issueNote,
        ticketId: ticket.id,
      },
      performedAt: now,
    });
    return {
      success: true,
      ticketId: ticket.id,
      message: 'Issue reported successfully.',
    };
  });
}
