'use server';

import { desc, eq, and, count } from 'drizzle-orm';

import { db } from '@/db';
import { appNotifications, integrationSettings } from '@/db/schema';
import { getAuthenticatedUser } from '@/actions/auth';
import { logLatency, startLatencyTimer } from '@/lib/latency';
import { encrypt, decrypt } from '@/lib/crypto';
import { logAuditAction } from '@/lib/audit';
import { Resend } from 'resend';

export async function getUnreadCount() {
  const timer = startLatencyTimer();
  try {
    const user = await getAuthenticatedUser();
    if (!user) return 0;

    const [result] = await db
      .select({ count: count() })
      .from(appNotifications)
      .where(
        and(
          eq(appNotifications.userId, user.id),
          eq(appNotifications.isRead, false)
        )
      );

    return result.count;
  } finally {
    logLatency({ scope: 'ACTION', label: 'notifications.getUnreadCount', startTime: timer });
  }
}

export async function getNotifications(limit = 10, offset = 0) {
  const timer = startLatencyTimer();
  try {
    const user = await getAuthenticatedUser();
    if (!user) return [];

    const data = await db
      .select()
      .from(appNotifications)
      .where(eq(appNotifications.userId, user.id))
      .orderBy(desc(appNotifications.createdAt))
      .limit(limit)
      .offset(offset);

    return data;
  } finally {
    logLatency({ scope: 'ACTION', label: 'notifications.getNotifications', startTime: timer });
  }
}

export async function markAsRead(id: string) {
  const timer = startLatencyTimer();
  try {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error('Unauthorized');

    await db
      .update(appNotifications)
      .set({ isRead: true })
      .where(
        and(
          eq(appNotifications.id, id),
          eq(appNotifications.userId, user.id)
        )
      );
      
    // Usually with server actions it's good to revalidate paths, but if we're using SWR, SWR handles the revalidation. 
  } finally {
    logLatency({ scope: 'ACTION', label: 'notifications.markAsRead', startTime: timer });
  }
}

export async function markAllAsRead() {
  const timer = startLatencyTimer();
  try {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error('Unauthorized');

    await db
      .update(appNotifications)
      .set({ isRead: true })
      .where(
        and(
          eq(appNotifications.userId, user.id),
          eq(appNotifications.isRead, false)
        )
      );
  } finally {
    logLatency({ scope: 'ACTION', label: 'notifications.markAllAsRead', startTime: timer });
  }
}

/**
 * Fetch whether Resend and Teams integrations are configured (returns configuration status without leaking keys)
 */
export async function getIntegrationStatus() {
  const timer = startLatencyTimer();
  try {
    const user = await getAuthenticatedUser();
    if (!user || (user.role !== 'GlobalAdmin' && user.role !== 'ITOperator')) {
      throw new Error('Forbidden: Unauthorized role');
    }

    const [settings] = await db
      .select()
      .from(integrationSettings)
      .where(eq(integrationSettings.id, 1))
      .limit(1);

    return {
      success: true,
      data: {
        resendConfigured: !!settings?.resendApiKey,
        teamsConfigured: !!settings?.teamsWebhookUrl,
      },
    };
  } catch (error: unknown) {
    console.error('Failed to fetch integration status:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return { success: false, error: errMsg };
  } finally {
    logLatency({ scope: 'ACTION', label: 'notifications.getIntegrationStatus', startTime: timer });
  }
}

/**
 * Encrypt and save Resend and Teams Webhook credentials.
 */
export async function saveIntegrationSettings(data: { resendApiKey?: string; teamsWebhookUrl?: string }) {
  const timer = startLatencyTimer();
  try {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'GlobalAdmin') {
      throw new Error('Forbidden: Only Global Administrators can configure integrations');
    }

    const [existing] = await db
      .select()
      .from(integrationSettings)
      .where(eq(integrationSettings.id, 1))
      .limit(1);

    const valuesToUpdate: Partial<typeof integrationSettings.$inferInsert> = {};
    const { resendApiKey, teamsWebhookUrl } = data;

    if (resendApiKey && resendApiKey !== '••••••••') {
      valuesToUpdate.resendApiKey = encrypt(resendApiKey);
    }
    if (teamsWebhookUrl && teamsWebhookUrl !== '••••••••') {
      valuesToUpdate.teamsWebhookUrl = encrypt(teamsWebhookUrl);
    }

    if (Object.keys(valuesToUpdate).length === 0) {
      return { success: true, message: 'No changes made' };
    }

    valuesToUpdate.updatedAt = new Date();

    if (existing) {
      await db
        .update(integrationSettings)
        .set(valuesToUpdate)
        .where(eq(integrationSettings.id, 1));
    } else {
      await db
        .insert(integrationSettings)
        .values({
          id: 1,
          ...valuesToUpdate,
        });
    }

    // Log the audit action
    await logAuditAction({
      entityType: 'integration_settings',
      entityId: '1',
      actionType: existing ? 'UPDATE' : 'CREATE',
      performedById: user.id,
      oldData: existing
        ? {
            resendApiKeyConfigured: !!existing.resendApiKey,
            teamsWebhookUrlConfigured: !!existing.teamsWebhookUrl,
          }
        : {},
      newData: {
        resendApiKeyConfigured: !!valuesToUpdate.resendApiKey || (existing ? !!existing.resendApiKey : false),
        teamsWebhookUrlConfigured: !!valuesToUpdate.teamsWebhookUrl || (existing ? !!existing.teamsWebhookUrl : false),
      },
    });

    return { success: true, message: 'Integration settings saved successfully' };
  } catch (error: unknown) {
    console.error('Failed to save integration settings:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return { success: false, error: errMsg };
  } finally {
    logLatency({ scope: 'ACTION', label: 'notifications.saveIntegrationSettings', startTime: timer });
  }
}

/**
 * Directly dispatches a test notification to verify credentials without QStash queueing.
 */
export async function testIntegrationConnection(channel: 'email' | 'teams', credentials: { resendApiKey?: string; teamsWebhookUrl?: string }) {
  const timer = startLatencyTimer();
  try {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'GlobalAdmin') {
      throw new Error('Forbidden: Only Global Administrators can test integrations');
    }

    const [settings] = await db
      .select()
      .from(integrationSettings)
      .where(eq(integrationSettings.id, 1))
      .limit(1);

    if (channel === 'email') {
      let key = credentials.resendApiKey;
      if (!key || key === '••••••••') {
        if (!settings || !settings.resendApiKey) {
          throw new Error('No Resend API key configured or provided');
        }
        key = decrypt(settings.resendApiKey);
      }

      const resend = new Resend(key);
      const fromEmail = process.env.RESEND_FROM || 'onboarding@resend.dev';
      const testResult = await resend.emails.send({
        from: fromEmail,
        to: user.email,
        subject: 'TIQRI Assets — Resend Connection Test',
        html: `
          <div style="font-family: sans-serif; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 450px; margin: 0 auto;">
            <h2 style="color: #040d5a; margin-bottom: 12px;">✅ Resend Connection Test Successful!</h2>
            <p>Your transactional email integration with Resend has been verified by <strong>${user.name}</strong>.</p>
            <p style="font-size: 12px; color: #64748b;">Ready to dispatch automated alerts.</p>
          </div>
        `,
      });

      if (testResult.error) {
        throw new Error(testResult.error.message || 'Resend API returned an error');
      }

      return { success: true, message: 'Test connection email sent successfully' };
    } else if (channel === 'teams') {
      let url = credentials.teamsWebhookUrl;
      if (!url || url === '••••••••') {
        if (!settings || !settings.teamsWebhookUrl) {
          throw new Error('No MS Teams Webhook URL configured or provided');
        }
        url = decrypt(settings.teamsWebhookUrl);
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          '@type': 'MessageCard',
          '@context': 'http://schema.org/extensions',
          'themeColor': '040D5A',
          'summary': 'TIQRI Assets Webhook Test',
          'title': '✅ Webhook Test Connection Successful',
          'text': `Integration diagnostic test initiated by **${user.name}** was successful! Your webhook channel is ready to receive automated alert notifications.`,
        }),
      });

      if (!response.ok) {
        throw new Error(`Teams Webhook responded with status: ${response.status} ${response.statusText}`);
      }

      return { success: true, message: 'Test Teams notification posted successfully' };
    }

    throw new Error('Invalid channel selected');
  } catch (error: unknown) {
    console.error(`Failed to test ${channel} integration:`, error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return { success: false, error: errMsg };
  } finally {
    logLatency({ scope: 'ACTION', label: 'notifications.testIntegrationConnection', startTime: timer });
  }
}
