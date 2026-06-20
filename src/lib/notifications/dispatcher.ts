// src/lib/notifications/dispatcher.ts
import { serverEnv } from '@/lib/env';
import { clientEnv } from '@/lib/env.client';
import { db } from '@/db';
import {
  appNotifications,
  notificationRules,
  notificationLogs,
} from '@/db/schema';
import { eq } from 'drizzle-orm';
import { Client } from '@upstash/qstash';
import { NotificationPayload } from '@/types/notifications';

// Initialize the QStash client using environment variables
let qstashClient: Client | null = null;

function getQStashClient() {
  if (qstashClient) return qstashClient;
  const token = serverEnv.QSTASH_TOKEN;
  if (!token) {
    console.warn(
      'QSTASH_TOKEN is not configured. QStash queueing will be unavailable.'
    );
    return null;
  }
  qstashClient = new Client({ token });
  return qstashClient;
}

/**
 * Dispatch an alert notification to all configured channels for the given event type.
 */
export async function dispatchAlert(payload: NotificationPayload) {
  try {
    const { eventType, userId, title, message, targetUrl } = payload;

    // 1. Map eventType to corresponding ruleKey in database
    const ruleKey =
      eventType === 'WARRANTY_EXPIRY' ? 'WARRANTY_EXPIRY_WARNING' : eventType;

    // 2. Query the rule settings from the database
    const [rule] = await db
      .select()
      .from(notificationRules)
      .where(eq(notificationRules.ruleKey, ruleKey))
      .limit(1);

    // If the rule is not found or not enabled, skip dispatching
    if (!rule || !rule.isEnabled) {
      console.log(
        `Notification rule '${ruleKey}' is disabled or not found. Skipping dispatch.`
      );
      return { success: false, reason: 'Rule disabled or not found' };
    }

    let notificationId: string | undefined;

    // 3. Dispatch In-App channel (Direct DB Insert)
    if (rule.channelInApp) {
      try {
        const [insertedNotification] = await db
          .insert(appNotifications)
          .values({
            userId,
            title,
            message,
            targetUrl,
            eventType,
            isRead: false,
          })
          .returning();

        if (insertedNotification && insertedNotification.id) {
          notificationId = insertedNotification.id;

          await db.insert(notificationLogs).values({
            notificationId,
            userId,
            targetUrl,
            eventType,
            channel: 'in_app',
            status: 'sent',
            sentAt: new Date(),
          });
        } else {
          // Returning may legitimately be empty; record failure and continue
          const msg = 'Insert returned no rows';
          console.error(
            'In-App insert succeeded but no row was returned:',
            msg
          );
          await db.insert(notificationLogs).values({
            notificationId: null,
            userId,
            targetUrl,
            eventType,
            channel: 'in_app',
            status: 'failed',
            errorMessage: msg,
            sentAt: new Date(),
          });
        }
      } catch (err: unknown) {
        console.error('Failed to dispatch In-App notification:', err);
        const errMsg = err instanceof Error ? err.message : String(err);
        await db.insert(notificationLogs).values({
          notificationId: null,
          userId,
          targetUrl,
          eventType,
          channel: 'in_app',
          status: 'failed',
          errorMessage: errMsg,
          sentAt: new Date(),
        });
      }
    }

    // Determine the base URL for route handlers
    const baseUrl = clientEnv.NEXT_PUBLIC_APP_URL;
    const qstash = getQStashClient();

    // 4. Dispatch Email channel (QStash queueing)
    if (rule.channelEmail) {
      if (qstash) {
        try {
          const emailEndpoint = `${baseUrl}/api/qstash/email`;
          await qstash.publishJSON({
            url: emailEndpoint,
            body: payload,
          });

          await db.insert(notificationLogs).values({
            notificationId: notificationId ?? null,
            userId,
            targetUrl,
            eventType,
            channel: 'email',
            status: 'sent',
            sentAt: new Date(),
          });
        } catch (err: unknown) {
          console.error('Failed to queue Email via QStash:', err);
          const errMsg = err instanceof Error ? err.message : String(err);
          await db.insert(notificationLogs).values({
            notificationId: notificationId ?? null,
            userId,
            targetUrl,
            eventType,
            channel: 'email',
            status: 'failed',
            errorMessage: errMsg,
            sentAt: new Date(),
          });
        }
      } else {
        console.warn('Unable to queue Email: QStash client not initialized.');
        await db.insert(notificationLogs).values({
          notificationId: notificationId ?? null,
          userId,
          targetUrl,
          eventType,
          channel: 'email',
          status: 'failed',
          errorMessage: 'QStash client not initialized',
          sentAt: new Date(),
        });
      }
    }

    // 5. Dispatch Teams channel (QStash queueing)
    if (rule.channelTeams) {
      if (qstash) {
        try {
          const teamsEndpoint = `${baseUrl}/api/qstash/teams`;
          await qstash.publishJSON({
            url: teamsEndpoint,
            body: payload,
          });

          await db.insert(notificationLogs).values({
            notificationId: notificationId ?? null,
            userId,
            targetUrl,
            eventType,
            channel: 'teams',
            status: 'sent',
            sentAt: new Date(),
          });
        } catch (err: unknown) {
          console.error('Failed to queue Teams via QStash:', err);
          const errMsg = err instanceof Error ? err.message : String(err);
          await db.insert(notificationLogs).values({
            notificationId: notificationId ?? null,
            userId,
            targetUrl,
            eventType,
            channel: 'teams',
            status: 'failed',
            errorMessage: errMsg,
            sentAt: new Date(),
          });
        }
      } else {
        console.warn('Unable to queue Teams: QStash client not initialized.');
        await db.insert(notificationLogs).values({
          notificationId: notificationId ?? null,
          userId,
          targetUrl,
          eventType,
          channel: 'teams',
          status: 'failed',
          errorMessage: 'QStash client not initialized',
          sentAt: new Date(),
        });
      }
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Critical failure in dispatchAlert:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return { success: false, error: errMsg };
  }
}
