import 'server-only';
import { serverEnv } from '@/lib/env';

import { Client } from '@upstash/qstash';
import { and, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

import { db } from '@/db';
import { webhookSubscriptions } from '@/db/schema';
import { decrypt } from '@/lib/crypto';
import type { WebhookEnvelope, WebhookEventType } from '@/types/integrations';

import { calculateHmacSignature } from './signature';
import { isAllowedWebhookDestination } from './validate-destination';

function getQStashClient() {
  const token = serverEnv.QSTASH_TOKEN;

  if (!token) {
    throw new Error('QSTASH_TOKEN not set in environment variables');
  }

  return new Client({ token });
}

export async function dispatchWebhookEvent(
  eventType: WebhookEventType,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const subscriptions = await db.query.webhookSubscriptions.findMany({
      where: and(
        eq(webhookSubscriptions.isActive, true),
        sql`${webhookSubscriptions.events} @> ${JSON.stringify([eventType])}::jsonb`
      ),
    });

    // Re-checked at dispatch so rows written before the destination guard
    // existed cannot be used to reach an internal host.
    const deliverable = subscriptions.filter((subscription) => {
      if (isAllowedWebhookDestination(subscription.url)) return true;
      console.error(
        `[dispatchWebhookEvent] Skipping disallowed destination for subscription ${subscription.id}`
      );
      return false;
    });

    if (deliverable.length === 0) {
      return;
    }

    const envelope: WebhookEnvelope = {
      event_id: `evt_${randomUUID().replace(/-/g, '').slice(0, 12)}`,
      event_type: eventType,
      created_at: new Date().toISOString(),
      data,
    };

    const bodyString = JSON.stringify(envelope);
    const qstash = getQStashClient();

    await Promise.allSettled(
      deliverable.map(async (subscription) => {
        const secret = decrypt(subscription.secret);
        const signature = calculateHmacSignature(bodyString, secret);

        await qstash.publishJSON({
          url: subscription.url,
          body: envelope,
          headers: {
            'X-EITAMS-Signature': signature,
            'X-EITAMS-Event': eventType,
          },
          retries: 3,
        });
      })
    );
  } catch (error) {
    console.error(
      '[dispatchWebhookEvent] Failed to dispatch webhook event:',
      error
    );
  }
}
