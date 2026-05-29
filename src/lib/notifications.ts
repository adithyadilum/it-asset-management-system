/**
 * Notification Service Infrastructure
 *
 * This module provides a standardized way to trigger notifications for asset-related actions.
 * Currently implemented as a mock service that logs to the console, it is designed to be 
 * easily extended to use external providers (e.g., SendGrid, AWS SES, or an internal notification API).
 */

export type AssetNotificationType = 'assignment_reminder' | 'return_request';

export interface AssetNotificationParams {
  type: AssetNotificationType;
  recipientEmail: string;
  assetTag: string;
  assetName: string;
}

/**
 * Sends a notification to a user regarding an asset.
 * In a real implementation, this would send an email, Slack message, or push notification.
 */
export async function sendAssetNotification(params: AssetNotificationParams): Promise<void> {
  const { type, recipientEmail, assetTag, assetName } = params;

  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 500));

  let message = '';
  let subject = '';

  switch (type) {
    case 'assignment_reminder':
      subject = `Action Required: Asset Assignment ${assetTag}`;
      message = `Hello,\n\nYou have been assigned the asset "${assetName}" (${assetTag}). Please log in to the IT Asset Management System to accept and acknowledge receipt of this asset.\n\nThank you,\nIT Asset Management Team`;
      break;
    case 'return_request':
      subject = `Return Request: Asset ${assetTag}`;
      message = `Hello,\n\nThe IT department has requested the return of asset "${assetName}" (${assetTag}). Please return the asset to the IT department by the due date.\n\nThank you,\nIT Asset Management Team`;
      break;
    default:
      console.warn(`[NOTIFICATION] Unknown notification type: ${type}`);
      return;
  }

  // LOGGING (Mocking the actual send)
  console.info('==================================================');
  console.info(`[NOTIFICATION SENT]`);
  console.info(`To: ${recipientEmail}`);
  console.info(`Subject: ${subject}`);
  console.info(`Message: ${message}`);
  console.info('==================================================');

  return;
}
