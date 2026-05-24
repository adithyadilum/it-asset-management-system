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
  appNotifications,
} from '@/db/schema';
import { eq, and, or, isNull, isNotNull, inArray, notInArray, sql } from 'drizzle-orm';
import { dispatchAlert } from '@/lib/notifications/dispatcher';

/**
 * Handle incoming POST requests from Upstash QStash native scheduler.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Verify QStash signature for security
    const currentKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
    const nextKey = process.env.QSTASH_NEXT_SIGNING_KEY;

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

    const isValid = await receiver.verify({
      signature,
      body: bodyText,
      url: req.url,
    }).catch((err) => {
      console.error('Signature verification threw error:', err);
      return false;
    });

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid Upstash signature' },
        { status: 401 }
      );
    }

    console.log('CRON job signature verified successfully. Running alert checks...');

    // 2. Run warrantyExpiryCheck
    await runWarrantyExpiryCheck();

    // 3. Run overdueReturnCheck
    await runOverdueReturnCheck();

    // 4. Run overdueRepairCheck
    await runOverdueRepairCheck();

    return NextResponse.json({ success: true, message: 'All checks processed successfully' });
  } catch (error: any) {
    console.error('CRON job execution failed:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message || String(error) },
      { status: 500 }
    );
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

  console.log(`Found ${expiringAssets.length} assets with expiring warranties within ${thresholdDays} days.`);

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
      // Check if a notification already exists (deduplication)
      const [existing] = await db
        .select()
        .from(appNotifications)
        .where(
          and(
            eq(appNotifications.userId, recipient.id),
            eq(appNotifications.eventType, 'WARRANTY_EXPIRY'),
            eq(appNotifications.targetUrl, targetUrl)
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
    const targetUrl = `/operations/assignments/${assignment.assignmentId}`;
    const recipientId = assignment.assignedById;

    // Deduplicate
    const [existing] = await db
      .select()
      .from(appNotifications)
      .where(
        and(
          eq(appNotifications.userId, recipientId),
          eq(appNotifications.eventType, 'RETURN_OVERDUE'),
          eq(appNotifications.targetUrl, targetUrl)
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
    console.log('Return Overdue rule is disabled (used for Overdue Repair checks).');
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
    const targetUrl = `/operations/maintenance/${ticket.ticketId}`;
    const recipientId = ticket.dispatchedById;

    // Deduplicate
    const [existing] = await db
      .select()
      .from(appNotifications)
      .where(
        and(
          eq(appNotifications.userId, recipientId),
          eq(appNotifications.eventType, 'RETURN_OVERDUE'),
          eq(appNotifications.targetUrl, targetUrl)
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
