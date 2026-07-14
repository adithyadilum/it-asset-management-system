// src/app/api/qstash/teams/route.ts
import { serverEnv } from '@/lib/env';
import { clientEnv } from '@/lib/env.client';
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

    const baseUrl = clientEnv.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
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

    // QStash owns retry/backoff; each worker invocation performs one attempt.
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
    console.error('Teams dispatch worker failed:', error);
    return NextResponse.json(
      { error: 'Teams delivery failed' },
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
 * Send one HTTP request and let QStash retry failed worker invocations.
 */
async function sendTeamsNotificationWithRetry({
  webhookUrl,
  cardPayload,
  eventType,
  userId,
  targetUrl,
}: TeamsRetryParams) {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cardPayload),
    });
    if (!response.ok) {
      throw new Error(
        `Teams Webhook responded with status: ${response.status}`
      );
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await db.insert(notificationLogs).values({
      eventType,
      channel: 'teams',
      status: 'failed',
      errorMessage: errMsg.slice(0, 1000),
      sentAt: new Date(),
      userId,
      targetUrl,
    });
    throw err;
  }
}
