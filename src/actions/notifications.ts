'use server';

import { desc, eq, and, count } from 'drizzle-orm';

import { db } from '@/db';
import { appNotifications, integrationSettings } from '@/db/schema';
import { getAuthenticatedUser , enforceActionAccess } from '@/actions/auth';
import { logLatency, startLatencyTimer } from '@/lib/latency';
import { encrypt, decrypt } from '@/lib/crypto';
import { logAuditAction } from '@/lib/audit';
import { Resend } from 'resend';
import { serverEnv } from '@/lib/env';
import {
  getNotificationsParamsSchema,
  markAsReadParamsSchema,
} from '@/lib/validations/notifications';

/**
 * Microsoft Teams webhook endpoints must stay on this host allow-list.
 * Add new Microsoft-owned webhook hosts here when Teams changes endpoint formats.
 */
const TEAMS_WEBHOOK_ALLOWED_ORIGINS = {
  'outlook.office.com': 'https://outlook.office.com',
  'outlook.office365.com': 'https://outlook.office365.com',
  'webhook.office.com': 'https://webhook.office.com',
} as const;

/**
 * Normalize a Teams Webhook URL so fetch never receives a user-controlled host.
 */
function toSafeTeamsWebhookUrl(urlStr: string): string | null {
  try {
    const url = new URL(urlStr);
    if (url.protocol !== 'https:') return null;
    if (url.username || url.password) return null;

    const hostname = url.hostname.toLowerCase();
    const allowedOrigin =
      TEAMS_WEBHOOK_ALLOWED_ORIGINS[
        hostname as keyof typeof TEAMS_WEBHOOK_ALLOWED_ORIGINS
      ];

    if (!allowedOrigin) return null;

    const safeUrl = new URL(allowedOrigin);
    safeUrl.pathname = url.pathname;
    safeUrl.search = url.search;
    return safeUrl.toString();
  } catch {
    return null;
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Escape markdown characters to prevent Teams card injection
 */
function escapeMarkdown(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe.replace(/([\\_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

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
    logLatency({
      scope: 'ACTION',
      label: 'notifications.getUnreadCount',
      startTime: timer,
    });
  }
}

export async function getNotifications(limit = 10, offset = 0) {
  const timer = startLatencyTimer();
  try {
    const user = await getAuthenticatedUser();
    if (!user) return [];

    const validation = getNotificationsParamsSchema.safeParse({ limit, offset });
    if (!validation.success) {
      throw new Error('Invalid query parameters.');
    }
    const { limit: safeLimit, offset: safeOffset } = validation.data;

    const data = await db
      .select()
      .from(appNotifications)
      .where(eq(appNotifications.userId, user.id))
      .orderBy(desc(appNotifications.createdAt))
      .limit(safeLimit)
      .offset(safeOffset);

    return data;
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'notifications.getNotifications',
      startTime: timer,
    });
  }
}

export async function markAsRead(id: string) {
  const timer = startLatencyTimer();
  try {
    const user = await enforceActionAccess();

    const validation = markAsReadParamsSchema.safeParse({ id });
    if (!validation.success) {
      throw new Error('Invalid notification ID format.');
    }

    const updated = await db
      .update(appNotifications)
      .set({ isRead: true })
      .where(
        and(eq(appNotifications.id, id), eq(appNotifications.userId, user.id))
      )
      .returning();

    if (updated.length === 0) {
      throw new Error('Notification not found or unauthorized.');
    }
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'notifications.markAsRead',
      startTime: timer,
    });
  }
}

export async function markAllAsRead() {
  const timer = startLatencyTimer();
  try {
    const user = await enforceActionAccess();

    await db
      .update(appNotifications)
      .set({ isRead: true })
      .where(
        and(
          eq(appNotifications.userId, user.id),
          eq(appNotifications.isRead, false)
        )
      )
      .returning();
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'notifications.markAllAsRead',
      startTime: timer,
    });
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
        isAdmin: user.role === 'GlobalAdmin',
      },
    };
  } catch (error: unknown) {
    console.error('Failed to fetch integration status:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return { success: false, error: errMsg };
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'notifications.getIntegrationStatus',
      startTime: timer,
    });
  }
}

/**
 * Encrypt and save Resend and Teams Webhook credentials.
 */
export async function saveIntegrationSettings(data: {
  resendApiKey?: string;
  teamsWebhookUrl?: string;
}) {
  const timer = startLatencyTimer();
  try {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'GlobalAdmin') {
      throw new Error(
        'Forbidden: Only Global Administrators can configure integrations'
      );
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
      const safeTeamsWebhookUrl = toSafeTeamsWebhookUrl(teamsWebhookUrl);
      if (!safeTeamsWebhookUrl) {
        throw new Error(
          'Invalid Teams Webhook URL. Must be an HTTPS outlook or office.com webhook URL.'
        );
      }
      valuesToUpdate.teamsWebhookUrl = encrypt(safeTeamsWebhookUrl);
    }

    if (Object.keys(valuesToUpdate).length === 0) {
      return { success: true, message: 'No changes made' };
    }

    valuesToUpdate.updatedAt = new Date();

    if (existing) {
      const updated = await db
        .update(integrationSettings)
        .set(valuesToUpdate)
        .where(eq(integrationSettings.id, 1))
        .returning();
      if (!updated.length) {
        throw new Error('Failed to update integration settings');
      }
    } else {
      const inserted = await db
        .insert(integrationSettings)
        .values({
          id: 1,
          ...valuesToUpdate,
        })
        .returning();
      if (!inserted.length) {
        throw new Error('Failed to create integration settings');
      }
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
        resendApiKeyConfigured:
          !!valuesToUpdate.resendApiKey ||
          (existing ? !!existing.resendApiKey : false),
        teamsWebhookUrlConfigured:
          !!valuesToUpdate.teamsWebhookUrl ||
          (existing ? !!existing.teamsWebhookUrl : false),
      },
    });

    return {
      success: true,
      message: 'Integration settings saved successfully',
    };
  } catch (error: unknown) {
    console.error('Failed to save integration settings:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return { success: false, error: errMsg };
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'notifications.saveIntegrationSettings',
      startTime: timer,
    });
  }
}

/**
 * Directly dispatches a test notification to verify credentials without QStash queueing.
 */
export async function testIntegrationConnection(
  channel: 'email' | 'teams',
  credentials: { resendApiKey?: string; teamsWebhookUrl?: string }
) {
  const timer = startLatencyTimer();
  try {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== 'GlobalAdmin') {
      throw new Error(
        'Forbidden: Only Global Administrators can test integrations'
      );
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
      const fromEmail = serverEnv.RESEND_FROM || 'onboarding@resend.dev';
      const testResult = await resend.emails.send({
        from: fromEmail,
        to: user.email,
        subject: 'TIQRI Assets — Resend Connection Test',
        html: `
          <div style="font-family: sans-serif; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 450px; margin: 0 auto;">
            <h2 style="color: #040d5a; margin-bottom: 12px;">✅ Resend Connection Test Successful!</h2>
            <p>Your transactional email integration with Resend has been verified by <strong>${escapeHtml(user.name ?? 'Admin')}</strong>.</p>
            <p style="font-size: 12px; color: #64748b;">Ready to dispatch automated alerts.</p>
          </div>
        `,
      });

      if (testResult.error) {
        throw new Error(
          testResult.error.message || 'Resend API returned an error'
        );
      }

      return {
        success: true,
        message: 'Test connection email sent successfully',
      };
    } else if (channel === 'teams') {
      let url = credentials.teamsWebhookUrl;
      if (!url || url === '••••••••') {
        if (!settings || !settings.teamsWebhookUrl) {
          throw new Error('No MS Teams Webhook URL configured or provided');
        }
        url = decrypt(settings.teamsWebhookUrl);
      }

      const safeTeamsWebhookUrl = toSafeTeamsWebhookUrl(url);
      if (!safeTeamsWebhookUrl) {
        throw new Error(
          'Invalid Teams Webhook URL. Must be an HTTPS outlook or office.com webhook URL.'
        );
      }

      const response = await fetch(safeTeamsWebhookUrl, {
        method: 'POST',
        redirect: 'error',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          '@type': 'MessageCard',
          '@context': 'http://schema.org/extensions',
          themeColor: '040D5A',
          summary: 'TIQRI Assets Webhook Test',
          title: '✅ Webhook Test Connection Successful',
          text: `Integration diagnostic test initiated by **${escapeMarkdown(user.name ?? 'Admin')}** was successful! Your webhook channel is ready to receive automated alert notifications.`,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Teams Webhook responded with status: ${response.status} ${response.statusText}`
        );
      }

      return {
        success: true,
        message: 'Test Teams notification posted successfully',
      };
    }

    throw new Error('Invalid channel selected');
  } catch (error: unknown) {
    console.error('Failed to test %s integration:', channel, error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return { success: false, error: errMsg };
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'notifications.testIntegrationConnection',
      startTime: timer,
    });
  }
}
