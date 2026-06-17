// src/app/api/qstash/cron/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { db } from '@/db';
import {
  assets,
  assetPurchases,
  assetAssignments,
  maintenanceTickets,
  users,
  notificationRules,
  notificationLogs,
  notificationQueue,
} from '@/db/schema';
import {
  asc,
  eq,
  and,
  or,
  isNull,
  isNotNull,
  inArray,
  notInArray,
  gte,
  lte,
  sql,
} from 'drizzle-orm';
import { dispatchAlert } from '@/lib/notifications/dispatcher';
import { formatDate } from '@/lib/date';
import { serverEnv } from '@/lib/env';

/**
 * Handle incoming POST requests from Upstash QStash native scheduler.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Verify QStash signature for security
    const currentKey = serverEnv.QSTASH_CURRENT_SIGNING_KEY;
    const nextKey = serverEnv.QSTASH_NEXT_SIGNING_KEY;

    if (!currentKey || !nextKey) {
      console.error('QStash signing keys are missing in environment variables');
      return NextResponse.json(
        { error: 'Signing keys misconfigured' },
        { status: 500 }
      );
    }

    const signature = req.headers.get('Upstash-Signature');
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing Upstash signature' },
        { status: 401 }
      );
    }

    const bodyText = await req.text();
    const receiver = new Receiver({
      currentSigningKey: currentKey,
      nextSigningKey: nextKey,
    });

    const isValid = await receiver
      .verify({
        signature,
        body: bodyText,
        url: req.url,
      })
      .catch((err) => {
        console.error('Signature verification threw error:', err);
        return false;
      });

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid Upstash signature' },
        { status: 401 }
      );
    }

    console.log(
      'CRON job signature verified successfully. Running alert checks...'
    );

    // 2. Run warrantyExpiryCheck
    await runWarrantyExpiryCheck();

    // 3. Run overdueReturnCheck
    await runOverdueReturnCheck();

    // 4. Run overdueRepairCheck
    await runOverdueRepairCheck();

    // 5. Run pending acceptance escalation checks
    await runPendingAcceptanceEscalation();

    // 6. Run upcoming return reminders
    await runUpcomingReturnCheck();

    return NextResponse.json({
      success: true,
      message: 'All checks processed successfully',
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('CRON job execution failed:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: errMsg },
      { status: 500 }
    );
  }
}

/**
 * Escalation engine for pending acceptance assignments.
 * - Looks at unprocessed rows in `notification_queue` and inserts escalation rows
 *   and dispatches in-app reminders at 24h, 48h, and 72h (escalate to admin).
 */
async function runPendingAcceptanceEscalation() {
  console.log('Starting pendingAcceptanceEscalation job...');

  const entries = await db
    .select({
      assignmentId: notificationQueue.assignmentId,
      recipientId: notificationQueue.recipientId,
      assignedDate: assetAssignments.assignedDate,
      assignedById: assetAssignments.assignedById,
      assignedToUserId: assetAssignments.assignedToUserId,
    })
    .from(notificationQueue)
    .innerJoin(
      assetAssignments,
      eq(notificationQueue.assignmentId, assetAssignments.id)
    )
    .where(
      and(
        eq(notificationQueue.isProcessed, false),
        eq(notificationQueue.eventType, 'PENDING_ACCEPTANCE'),
        eq(assetAssignments.state, 'pending approval'),
        isNull(assetAssignments.returnedDate)
      )
    );

  if (!entries || entries.length === 0) {
    console.log('No unprocessed notification_queue entries found.');
    return;
  }

  const now = new Date();
  const reminderRows: Array<{
    eventType: 'REMINDER_24H' | 'REMINDER_48H' | 'REMINDER_72H_ADMIN';
    assignmentId: number;
    recipientId: string;
  }> = [];
  const reminderDetails = new Map<
    string,
    {
      assignmentId: number;
      recipientId: string;
      assignedDate: Date;
      assignedById: string | null;
      assignedToUserId: string | null;
    }
  >();

  for (const entry of entries) {
    const assignedDate = entry.assignedDate
      ? new Date(entry.assignedDate)
      : null;
    if (!assignedDate) continue;

    const hours = Math.floor(
      (now.getTime() - assignedDate.getTime()) / (1000 * 60 * 60)
    );
    if (hours >= 24) {
      reminderRows.push({
        eventType: 'REMINDER_24H',
        assignmentId: entry.assignmentId,
        recipientId: entry.recipientId,
      });
      reminderDetails.set(
        `${entry.assignmentId}:REMINDER_24H:${entry.recipientId}`,
        {
          assignmentId: entry.assignmentId,
          recipientId: entry.recipientId,
          assignedDate,
          assignedById: entry.assignedById,
          assignedToUserId: entry.assignedToUserId,
        }
      );
    }

    if (hours >= 48) {
      reminderRows.push({
        eventType: 'REMINDER_48H',
        assignmentId: entry.assignmentId,
        recipientId: entry.recipientId,
      });
      reminderDetails.set(
        `${entry.assignmentId}:REMINDER_48H:${entry.recipientId}`,
        {
          assignmentId: entry.assignmentId,
          recipientId: entry.recipientId,
          assignedDate,
          assignedById: entry.assignedById,
          assignedToUserId: entry.assignedToUserId,
        }
      );
    }

    if (hours >= 72 && entry.assignedById) {
      reminderRows.push({
        eventType: 'REMINDER_72H_ADMIN',
        assignmentId: entry.assignmentId,
        recipientId: entry.assignedById,
      });
      reminderDetails.set(
        `${entry.assignmentId}:REMINDER_72H_ADMIN:${entry.assignedById}`,
        {
          assignmentId: entry.assignmentId,
          recipientId: entry.assignedById,
          assignedDate,
          assignedById: entry.assignedById,
          assignedToUserId: entry.assignedToUserId,
        }
      );
    }
  }

  if (reminderRows.length === 0) {
    return;
  }

  const insertedRows = await db
    .insert(notificationQueue)
    .values(reminderRows)
    .onConflictDoNothing()
    .returning({
      assignmentId: notificationQueue.assignmentId,
      recipientId: notificationQueue.recipientId,
      eventType: notificationQueue.eventType,
    });

  await Promise.all(
    insertedRows.map((row) =>
      dispatchPendingAcceptanceAlert(
        row.assignmentId,
        row.recipientId,
        row.eventType as 'REMINDER_24H' | 'REMINDER_48H' | 'REMINDER_72H_ADMIN',
        reminderDetails
      )
    )
  );
}

async function dispatchPendingAcceptanceAlert(
  assignmentId: number,
  recipientId: string,
  eventType: 'REMINDER_24H' | 'REMINDER_48H' | 'REMINDER_72H_ADMIN',
  reminderDetails: Map<
    string,
    {
      assignmentId: number;
      recipientId: string;
      assignedDate: Date;
      assignedById: string | null;
      assignedToUserId: string | null;
    }
  >
) {
  const details = reminderDetails.get(
    `${assignmentId}:${eventType}:${recipientId}`
  );
  if (!details) {
    return;
  }

  const targetUrl = `/portal/my-assets?assignmentId=${assignmentId}`;

  if (eventType === 'REMINDER_24H') {
    await dispatchAlert({
      eventType: 'ASSIGNMENT_PENDING',
      userId: recipientId,
      title: 'Action Required: Assignment Pending',
      message: `You have an assignment pending acknowledgment (assigned ${formatDate(details.assignedDate, 'PP')}). Please review.`,
      targetUrl,
    });
    return;
  }

  if (eventType === 'REMINDER_48H') {
    await dispatchAlert({
      eventType: 'ASSIGNMENT_PENDING',
      userId: recipientId,
      title: 'Reminder: Assignment Still Pending',
      message: `Your assignment from ${formatDate(details.assignedDate, 'PP')} is still awaiting acknowledgment.`,
      targetUrl,
    });
    return;
  }

  await dispatchAlert({
    eventType: 'ASSIGNMENT_PENDING',
    userId: recipientId,
    title: 'Escalation: Assignment Not Acknowledged',
    message: `Assignment #${details.assignmentId} assigned to user ${details.assignedToUserId ?? 'unknown'} has not been acknowledged after 72 hours.`,
    targetUrl: `/operations/assignments?assignmentId=${assignmentId}`,
  });
}

/**
 * Upcoming return checker: notifies employees of upcoming return dates within 14 days.
 */
async function runUpcomingReturnCheck() {
  console.log('Starting upcomingReturnCheck job...');

  const now = new Date();
  const in14 = new Date(now);
  in14.setDate(now.getDate() + 14);

  const rows = await db
    .select({
      assignmentId: assetAssignments.id,
      assetId: assetAssignments.assetId,
      assignedToUserId: assetAssignments.assignedToUserId,
      expectedReturnDate: assetAssignments.expectedReturnDate,
      assetTag: assets.assetTag,
      assetName: assets.name,
    })
    .from(assetAssignments)
    .innerJoin(assets, eq(assetAssignments.assetId, assets.id))
    .where(
      and(
        isNull(assetAssignments.returnedDate),
        inArray(assetAssignments.state, [
          'assigned',
          'pending approval',
          'overdue',
        ]),
        isNotNull(assetAssignments.expectedReturnDate),
        gte(assetAssignments.expectedReturnDate, now.toISOString()),
        lte(assetAssignments.expectedReturnDate, in14.toISOString())
      )
    )
    .orderBy(asc(assetAssignments.expectedReturnDate));

  console.log(
    `Found ${rows.length} assignments with upcoming returns within 14 days.`
  );

  for (const a of rows) {
    const targetUrl = `/portal/my-assets?assignmentId=${a.assignmentId}`;

    // Deduplicate via notification_logs
    if (!a.assignedToUserId) continue;

    const [existing] = await db
      .select()
      .from(notificationLogs)
      .where(
        and(
          eq(notificationLogs.userId, a.assignedToUserId),
          eq(notificationLogs.eventType, 'UPCOMING_RETURN'),
          eq(notificationLogs.targetUrl, targetUrl)
        )
      )
      .limit(1);

    if (!existing) {
      await dispatchAlert({
        eventType: 'UPCOMING_RETURN',
        userId: a.assignedToUserId as string,
        title: 'Upcoming Asset Return',
        message: `Your ${a.assetTag} is due for return on ${formatDate(a.expectedReturnDate, 'PP')}. Please back up your files.`,
        targetUrl,
      });
    }
  }
}

/**
 * warrantyExpiryCheck job:
 * Query assets where warranty_expiry_date - CURRENT_DATE <= threshold_days
 * AND where a notification has not already been sent (deduplication).
 */
async function runWarrantyExpiryCheck() {
  console.log('Starting warrantyExpiryCheck job...');
  const [rule] = await db
    .select()
    .from(notificationRules)
    .where(eq(notificationRules.ruleKey, 'WARRANTY_EXPIRY_WARNING'))
    .limit(1);

  if (!rule || !rule.isEnabled) {
    console.log('Warranty Expiry Warning rule is disabled or not found.');
    return;
  }

  const thresholdDays = rule.thresholdDays ?? 30;

  // Query assets where warranty is expiring soon
  const expiringAssets = await db
    .select({
      id: assets.id,
      assetTag: assets.assetTag,
      name: assets.name,
      warrantyExpiry: assetPurchases.warrantyExpiry,
    })
    .from(assets)
    .innerJoin(assetPurchases, eq(assets.id, assetPurchases.assetId))
    .where(
      and(
        eq(assets.isArchived, false),
        notInArray(assets.status, ['Disposed', 'Retired']),
        isNotNull(assetPurchases.warrantyExpiry),
        // warranty_expiry - CURRENT_DATE <= thresholdDays
        sql`${assetPurchases.warrantyExpiry} - CURRENT_DATE <= ${thresholdDays}`,
        // Only warn for future/upcoming expiries, or today
        sql`${assetPurchases.warrantyExpiry} >= CURRENT_DATE`
      )
    );

  console.log(
    `Found ${expiringAssets.length} assets with expiring warranties within ${thresholdDays} days.`
  );

  // Get active IT administrators and operators to notify
  const recipients = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.isActive, true),
        or(eq(users.role, 'GlobalAdmin'), eq(users.role, 'ITOperator'))
      )
    );

  for (const asset of expiringAssets) {
    const targetUrl = `/assets/${asset.id}`;

    for (const recipient of recipients) {
      // Check if a notification already exists in notification_logs (deduplication independent of channel)
      const [existing] = await db
        .select()
        .from(notificationLogs)
        .where(
          and(
            eq(notificationLogs.userId, recipient.id),
            eq(notificationLogs.eventType, 'WARRANTY_EXPIRY'),
            eq(notificationLogs.targetUrl, targetUrl)
          )
        )
        .limit(1);

      if (!existing) {
        await dispatchAlert({
          eventType: 'WARRANTY_EXPIRY',
          userId: recipient.id,
          title: 'Warranty Expiry Warning',
          message: `The warranty for asset ${asset.assetTag} (${asset.name || 'Unnamed'}) is expiring on ${asset.warrantyExpiry}.`,
          targetUrl,
        });
      }
    }
  }
}

/**
 * overdueReturnCheck job:
 * Query assignments where expected_return_date < CURRENT_DATE AND status = 'ACTIVE' (returnedDate is null & state is assigned/overdue)
 * Alert the assigning admin.
 */
async function runOverdueReturnCheck() {
  console.log('Starting overdueReturnCheck job...');
  const [rule] = await db
    .select()
    .from(notificationRules)
    .where(eq(notificationRules.ruleKey, 'RETURN_OVERDUE'))
    .limit(1);

  if (!rule || !rule.isEnabled) {
    console.log('Asset Return Overdue rule is disabled or not found.');
    return;
  }

  const overdueAssignments = await db
    .select({
      assignmentId: assetAssignments.id,
      assetId: assetAssignments.assetId,
      assignedById: assetAssignments.assignedById,
      expectedReturnDate: assetAssignments.expectedReturnDate,
      assetTag: assets.assetTag,
      assetName: assets.name,
    })
    .from(assetAssignments)
    .innerJoin(assets, eq(assetAssignments.assetId, assets.id))
    .where(
      and(
        isNull(assetAssignments.returnedDate),
        inArray(assetAssignments.state, ['assigned', 'overdue']),
        isNotNull(assetAssignments.expectedReturnDate),
        sql`${assetAssignments.expectedReturnDate} < CURRENT_DATE`
      )
    );

  console.log(`Found ${overdueAssignments.length} overdue assignments.`);

  for (const assignment of overdueAssignments) {
    const targetUrl = `/operations/assignments?assignmentId=${assignment.assignmentId}`;
    const recipientId = assignment.assignedById;

    // Deduplicate
    const [existing] = await db
      .select()
      .from(notificationLogs)
      .where(
        and(
          eq(notificationLogs.userId, recipientId),
          eq(notificationLogs.eventType, 'RETURN_OVERDUE'),
          eq(notificationLogs.targetUrl, targetUrl)
        )
      )
      .limit(1);

    if (!existing) {
      await dispatchAlert({
        eventType: 'RETURN_OVERDUE',
        userId: recipientId,
        title: 'Asset Return Overdue Alert',
        message: `Asset ${assignment.assetTag} (${assignment.assetName || 'Unnamed'}) was expected to be returned by ${assignment.expectedReturnDate} and is overdue.`,
        targetUrl,
      });
    }
  }
}

/**
 * overdueRepairCheck job:
 * Query MaintenanceTickets where status = 'Active' AND expected_return_date < CURRENT_DATE
 * Alert the dispatching admin.
 */
async function runOverdueRepairCheck() {
  console.log('Starting overdueRepairCheck job...');
  const [rule] = await db
    .select()
    .from(notificationRules)
    .where(eq(notificationRules.ruleKey, 'RETURN_OVERDUE'))
    .limit(1);

  if (!rule || !rule.isEnabled) {
    console.log(
      'Return Overdue rule is disabled (used for Overdue Repair checks).'
    );
    return;
  }

  const overdueTickets = await db
    .select({
      ticketId: maintenanceTickets.id,
      assetId: maintenanceTickets.assetId,
      dispatchedById: maintenanceTickets.dispatchedById,
      estimatedReturnDate: maintenanceTickets.estimatedReturnDate,
      assetTag: assets.assetTag,
      assetName: assets.name,
    })
    .from(maintenanceTickets)
    .innerJoin(assets, eq(maintenanceTickets.assetId, assets.id))
    .where(
      and(
        eq(maintenanceTickets.status, 'ACTIVE'),
        isNotNull(maintenanceTickets.estimatedReturnDate),
        sql`${maintenanceTickets.estimatedReturnDate} < CURRENT_DATE`
      )
    );

  console.log(`Found ${overdueTickets.length} overdue maintenance tickets.`);

  for (const ticket of overdueTickets) {
    const targetUrl = `/operations/maintenance?ticketId=${ticket.ticketId}`;
    const recipientId = ticket.dispatchedById;

    // Deduplicate
    const [existing] = await db
      .select()
      .from(notificationLogs)
      .where(
        and(
          eq(notificationLogs.userId, recipientId),
          eq(notificationLogs.eventType, 'RETURN_OVERDUE'),
          eq(notificationLogs.targetUrl, targetUrl)
        )
      )
      .limit(1);

    if (!existing) {
      await dispatchAlert({
        eventType: 'RETURN_OVERDUE',
        userId: recipientId,
        title: 'Overdue Repair Alert',
        message: `Asset ${ticket.assetTag} (${ticket.assetName || 'Unnamed'}) repair was expected to be returned by ${ticket.estimatedReturnDate} and is overdue.`,
        targetUrl,
      });
    }
  }
}
