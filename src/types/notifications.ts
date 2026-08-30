/**
 * Notification event types
 */
export type NotificationEventType =
  | 'WARRANTY_EXPIRY'
  | 'SOFTWARE_LICENSE_RENEWAL'
  | 'RETURN_OVERDUE'
  | 'MAINTENANCE_COMPLETED'
  | 'DISPOSAL_REQUEST'
  | 'DISPOSAL_APPROVED'
  | 'DISPOSAL_REJECTED'
  | 'ROLE_CHANGE'
  | 'ASSIGNMENT_PENDING'
  | 'ASSIGNMENT_ACCEPTED'
  | 'ASSIGNMENT_DECLINED'
  | 'ASSET_DEFECTIVE_REPORTED'
  | 'PENDING_ACCEPTANCE'
  | 'REMINDER_24H'
  | 'REMINDER_48H'
  | 'UPCOMING_RETURN'
  | 'RETURN_REQUESTED';

/**
 * Notification delivery channels
 */
export type NotificationChannel = 'in_app' | 'email' | 'teams';

/**
 * Notification category for grouping in settings UI
 */
export type NotificationCategory =
  'HARDWARE_LIFECYCLE' | 'OPERATIONAL' | 'SECURITY' | 'FINANCIAL';

/**
 * Notification payload for internal dispatcher
 */
export interface NotificationPayload {
  eventType: NotificationEventType;
  userId: string;
  title: string;
  message: string;
  targetUrl?: string;
  metadata?: Record<string, unknown>;
  timestamp?: Date;
}

/**
 * Notification rule configuration
 */
export interface NotificationRule {
  id: number;
  ruleKey: string;
  displayName: string;
  category: NotificationCategory;
  isEnabled: boolean;
  thresholdDays?: number;
  channelInApp: boolean;
  channelEmail: boolean;
  channelTeams: boolean;
  updatedById: string | null;
  updatedAt: Date;
}

/**
 * App notification record
 */
export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  targetUrl?: string;
  isRead: boolean;
  eventType: NotificationEventType;
  createdAt: Date;
}
