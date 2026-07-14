// src/app/api/qstash/email/route.ts
import { serverEnv } from '@/lib/env';
import { clientEnv } from '@/lib/env.client';
import { NextRequest, NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { Resend } from 'resend';
import { db } from '@/db';
import {
  users,
  assets,
  assetAssignments,
  maintenanceTickets,
  integrationSettings,
  notificationLogs,
} from '@/db/schema';
import { eq } from 'drizzle-orm';
import { decrypt } from '@/lib/crypto';
import {
  NotificationPayload,
  NotificationEventType,
} from '@/types/notifications';

/**
 * Handle incoming POST requests from QStash to dispatch emails.
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

    // 2. Parse the payload
    const payload: NotificationPayload = JSON.parse(bodyText);
    const { eventType, userId, title, message, targetUrl } = payload;

    // 3. Query the recipient's email address
    const [recipient] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!recipient || !recipient.email) {
      console.error(`Recipient email not found for userId: ${userId}`);
      return NextResponse.json(
        { error: 'Recipient email not found' },
        { status: 400 }
      );
    }

    // 4. Load the integration settings and decrypt Resend API key
    const [settings] = await db
      .select()
      .from(integrationSettings)
      .where(eq(integrationSettings.id, 1))
      .limit(1);

    if (!settings || !settings.resendApiKey) {
      console.error('Resend API key is not configured in integration settings');
      return NextResponse.json(
        { error: 'Email service unconfigured' },
        { status: 500 }
      );
    }

    let decryptedKey: string;
    try {
      decryptedKey = decrypt(settings.resendApiKey);
    } catch (err) {
      console.error('Failed to decrypt Resend API key:', err);
      return NextResponse.json(
        { error: 'Failed to decrypt Resend credentials' },
        { status: 500 }
      );
    }

    // 5. Dynamic Asset Identification from Deep-Link
    let assetName = 'IT Asset';
    let assetTag = 'N/A';

    if (targetUrl) {
      // Check if it's a direct asset page
      const assetMatch = targetUrl.match(
        /\/assets\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
      );
      if (assetMatch) {
        const assetId = assetMatch[1];
        const [assetDetails] = await db
          .select({ name: assets.name, assetTag: assets.assetTag })
          .from(assets)
          .where(eq(assets.id, assetId))
          .limit(1);
        if (assetDetails) {
          assetName = assetDetails.name || 'Unnamed Asset';
          assetTag = assetDetails.assetTag;
        }
      } else {
        // Check if it's an assignment page
        const assignmentMatch = targetUrl.match(
          /\/operations\/assignments\/(\d+)/
        );
        if (assignmentMatch) {
          const assignmentId = parseInt(assignmentMatch[1], 10);
          const [assignmentDetails] = await db
            .select({ name: assets.name, assetTag: assets.assetTag })
            .from(assetAssignments)
            .innerJoin(assets, eq(assetAssignments.assetId, assets.id))
            .where(eq(assetAssignments.id, assignmentId))
            .limit(1);
          if (assignmentDetails) {
            assetName = assignmentDetails.name || 'Assigned Asset';
            assetTag = assignmentDetails.assetTag;
          }
        } else {
          // Check if it's a maintenance ticket page
          const ticketMatch = targetUrl.match(
            /\/operations\/maintenance\/(\d+)/
          );
          if (ticketMatch) {
            const ticketId = parseInt(ticketMatch[1], 10);
            const [ticketDetails] = await db
              .select({ name: assets.name, assetTag: assets.assetTag })
              .from(maintenanceTickets)
              .innerJoin(assets, eq(maintenanceTickets.assetId, assets.id))
              .where(eq(maintenanceTickets.id, ticketId))
              .limit(1);
            if (ticketDetails) {
              assetName = ticketDetails.name || 'Repair Asset';
              assetTag = ticketDetails.assetTag;
            }
          }
        }
      }
    }

    const baseUrl = clientEnv.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const actionUrl = targetUrl
      ? targetUrl.startsWith('http')
        ? targetUrl
        : `${baseUrl}${targetUrl}`
      : baseUrl;

    const validatedActionUrl = validateAndEscapeUrl(actionUrl);
    const escapedMessage = escapeHtml(message);
    const escapedAssetName = escapeHtml(assetName);
    const escapedAssetTag = escapeHtml(assetTag);

    // 6. Generate the custom inline-styled HTML template
    const emailHtml = generateEmailHtml({
      title: escapeHtml(title),
      message: escapedMessage,
      assetName: escapedAssetName,
      assetTag: escapedAssetTag,
      actionUrl: validatedActionUrl,
    });

    const resend = new Resend(decryptedKey);

    const fromEmail = serverEnv.RESEND_FROM || 'onboarding@resend.dev';
    // QStash owns retry/backoff; each worker invocation performs one attempt.
    await sendEmailWithRetry({
      resend,
      emailOptions: {
        from: fromEmail,
        to: recipient.email,
        subject: `[TIQRI Assets] ${title}`,
        html: emailHtml,
      },
      eventType,
      userId,
      targetUrl,
    });

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
    });
  } catch (error: unknown) {
    console.error('Email dispatch worker failed:', error);
    return NextResponse.json(
      { error: 'Email delivery failed' },
      { status: 500 }
    );
  }
}

/**
 * Escape unsafe HTML characters to prevent XSS/HTML Injection
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
 * Enforce that the redirection URL points only to relative paths or trusted HTTPS origins
 */
function validateAndEscapeUrl(url: string): string {
  if (!url) return '';
  const baseUrlStr = clientEnv.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  let cleanUrl = url;

  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const parsedUrl = new URL(url);
      const parsedBase = new URL(baseUrlStr);
      if (
        parsedUrl.protocol !== parsedBase.protocol ||
        parsedUrl.hostname !== parsedBase.hostname ||
        parsedUrl.port !== parsedBase.port
      ) {
        cleanUrl = baseUrlStr;
      }
    } catch {
      cleanUrl = baseUrlStr;
    }
  } else if (!url.startsWith('/')) {
    cleanUrl = '/' + url;
  }

  return cleanUrl.replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

interface EmailHtmlParams {
  title: string;
  message: string;
  assetName: string;
  assetTag: string;
  actionUrl: string;
}

/**
 * Generate inline-styled HTML template corresponding to TIQRI Assets design guidelines.
 */
function generateEmailHtml({
  title,
  message,
  assetName,
  assetTag,
  actionUrl,
}: EmailHtmlParams): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="width: 100%; margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Noto Sans', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <div style="width: 100%; background-color: #f8fafc; padding: 40px 10px; box-sizing: border-box; text-align: center;">
    <div style="max-width: 406px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; box-shadow: 0px 4px 6px -1px rgba(0,0,0,0.05), 0px 2px 4px -1px rgba(0,0,0,0.02); padding: 40px 24px; box-sizing: border-box; margin: 0 auto; text-align: center;">
      <!-- LOGO -->
      <div style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 24px;">
        <img src="https://raw.githubusercontent.com/adithyadilum/it-asset-management-system/main/public/icon.png" width="40" height="40" alt="TIQRI Logo" style="object-fit: contain; vertical-align: middle;" />
        <span style="font-size: 28px; color: #040d5a; font-weight: 600; line-height: 40px; vertical-align: middle;">TIQRI Assets</span>
      </div>

      <!-- MAIN CONTAINER -->
      <div style="font-size: 24px; line-height: 32px; font-weight: 500; color: #0f172a; margin-bottom: 12px; margin-top: 10px;">
        Action Required
      </div>

      <div style="font-size: 14px; line-height: 20px; color: #64748b; margin-bottom: 24px;">
        ${message}
      </div>

      <!-- ASSET DETAILS BLOCK -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 30px; text-align: center;">
        <div style="font-size: 32px; margin-bottom: 10px;">💻</div>
        <div style="font-weight: 700; font-size: 15px; color: #000000; margin-bottom: 4px;">
          ${assetName}
        </div>
        <div style="font-size: 13px; color: #64748b;">
          Asset ID : ${assetTag}
        </div>
      </div>

      <!-- ACTION BUTTON -->
      <div style="margin-bottom: 30px;">
        <a href="${actionUrl}" style="display: block; background-color: #040d5a; color: #ffffff; text-decoration: none; font-weight: 500; font-size: 14px; line-height: 20px; padding: 10px 12px; border-radius: 8px; box-shadow: 0px 1px 2px rgba(0, 0, 0, 0.05); text-align: center; border: 1px solid #1e293b; box-sizing: border-box;">
          Confirm Receipt
        </a>
      </div>

      <!-- FOOTER HELP -->
      <div style="font-size: 12px; line-height: 16px; color: #64748b; margin-top: 20px;">
        Need help? Contact TIQRI IT Support
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

interface RetryParams {
  resend: Resend;
  emailOptions: {
    from: string;
    to: string;
    subject: string;
    html: string;
  };
  eventType: NotificationEventType;
  userId?: string;
  targetUrl?: string;
}

/**
 * Execute exactly one delivery attempt. A non-2xx worker response delegates
 * retry timing and attempt limits to QStash.
 */
async function sendEmailWithRetry({
  resend,
  emailOptions,
  eventType,
  userId,
  targetUrl,
}: RetryParams) {
  try {
    const result = await resend.emails.send(emailOptions);
    if (result.error) throw new Error(result.error.message || 'Resend error');
    return result;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await db.insert(notificationLogs).values({
      eventType,
      channel: 'email',
      status: 'failed',
      errorMessage: errMsg.slice(0, 1000),
      sentAt: new Date(),
      userId,
      targetUrl,
    });
    throw err;
  }
}
