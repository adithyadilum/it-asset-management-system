// src/app/api/qstash/teams/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { db } from '@/db';
import { integrationSettings, notificationLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { decrypt } from '@/lib/crypto';
import {
  NotificationPayload,
  NotificationEventType,
} from '@/types/notifications';

/**
 * Handle incoming POST requests from QStash to dispatch Teams adaptive/connector cards.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Verify QStash signature
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

    // 2. Parse payload
    const payload: NotificationPayload = JSON.parse(bodyText);
    const { eventType, title, message, targetUrl } = payload;

    // 3. Load integration settings and decrypt Teams Webhook URL
    const [settings] = await db
      .select()
      .from(integrationSettings)
      .where(eq(integrationSettings.id, 1))
      .limit(1);

    if (!settings || !settings.teamsWebhookUrl) {
      console.error(
        'Teams webhook URL is not configured in integration settings'
      );
      return NextResponse.json(
        { error: 'Teams service unconfigured' },
        { status: 500 }
      );
    }

    let decryptedWebhookUrl: string;
    try {
      decryptedWebhookUrl = decrypt(settings.teamsWebhookUrl);
    } catch (err) {
      console.error('Failed to decrypt Teams webhook URL:', err);
      return NextResponse.json(
        { error: 'Failed to decrypt Teams credentials' },
        { status: 500 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const rawActionUrl = targetUrl
      ? targetUrl.startsWith('http')
        ? targetUrl
        : targetUrl.startsWith('/')
          ? `${baseUrl}${targetUrl}`
          : `${baseUrl}/${targetUrl}`
      : baseUrl;

    let actionUrl = baseUrl;
    try {
      const parsedUrl = new URL(rawActionUrl);
      const parsedBase = new URL(baseUrl);
      if (
        parsedUrl.protocol === parsedBase.protocol &&
        parsedUrl.hostname === parsedBase.hostname &&
        parsedUrl.port === parsedBase.port
      ) {
        actionUrl = rawActionUrl;
      }
    } catch {
      actionUrl = baseUrl;
    }

    // 4. Format the MS Teams MessageCard payload
    const teamsCard = {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor: '040D5A', // TIQRI Corporate Dark Blue
      summary: 'TIQRI Assets Alert Notification',
      sections: [
        {
          activityTitle: 'TIQRI Assets Notification Hub',
          activitySubtitle: `Operational Event: ${eventType}`,
          activityImage:
            'https://raw.githubusercontent.com/adithyadilum/it-asset-management-system/main/public/icon.png',
          title: `📢 Action Required: ${title}`,
          text: message,
          markdown: true,
        },
      ],
      potentialAction: [
        {
          '@type': 'OpenUri',
          name: 'View Asset Details',
          targets: [
            {
              os: 'default',
              uri: actionUrl,
            },
          ],
        },
      ],
    };

    // 5. Post to Teams Webhook with automatic retries
    await sendTeamsNotificationWithRetry({
      webhookUrl: decryptedWebhookUrl,
      cardPayload: teamsCard,
      eventType,
      userId: payload.userId,
      targetUrl: payload.targetUrl,
    });

    return NextResponse.json({
      success: true,
      message: 'Teams notification dispatched successfully',
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Teams dispatch worker failed:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: errMsg },
      { status: 500 }
    );
  }
}

interface TeamsRetryParams {
  webhookUrl: string;
  cardPayload: Record<string, unknown>;
  eventType: NotificationEventType;
  userId?: string;
  targetUrl?: string;
}

/**
 * Send HTTP POST to Teams Incoming Webhook with backoff retry handling.
 * Logs failure on complete exhaustion to Dead Letter Log.
 */
async function sendTeamsNotificationWithRetry({
  webhookUrl,
  cardPayload,
  eventType,
  userId,
  targetUrl,
}: TeamsRetryParams) {
  const delays = [1000, 2000, 4000, 8000];
  let attempt = 0;

  while (attempt < 5) {
    try {
      attempt++;
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cardPayload),
      });

      if (!response.ok) {
        throw new Error(
          `Teams Webhook responded with status: ${response.status} ${response.statusText}`
        );
      }

      console.log(`Teams card successfully posted on attempt ${attempt}`);
      return;
    } catch (err) {
      console.warn(`Teams card delivery attempt ${attempt} failed:`, err);

      if (attempt >= 5) {
        // Log to Dead Letter Queue
        const errMsg = err instanceof Error ? err.message : String(err);
        try {
          await db.insert(notificationLogs).values({
            eventType,
            channel: 'teams',
            status: 'failed',
            errorMessage: `Exhausted 5 attempts. Last error: ${errMsg}`,
            sentAt: new Date(),
            userId,
            targetUrl,
          });
        } catch (dbErr) {
          console.error(
            'Failed to log Dead Letter Queue entry for Teams to DB:',
            dbErr
          );
        }

        // Return gracefully so QStash does not retry
        return null;
      }

      const backoffDelay = delays[attempt - 1] || 8000;
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }
}
