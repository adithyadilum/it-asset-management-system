//src/lib/notifications/services/index.ts
import { db } from '@/db';
import { appNotifications } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';

/**
 * Get all notifications for a user with pagination
 */
export async function getUserNotifications(
  userId: string,
  limit: number = 10,
  offset: number = 0
) {
  try {
    const notifications = await db
      .select()
      .from(appNotifications)
      .where(eq(appNotifications.userId, userId))
      .orderBy(desc(appNotifications.createdAt))
      .limit(limit)
      .offset(offset);

    return notifications;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw new Error('Failed to fetch notifications');
  }
}

/**
 * Get count of unread notifications for a user
 */
export async function getUnreadCount(userId: string) {
  try {
    const result = await db
      .select({ count: appNotifications.id })
      .from(appNotifications)
      .where(
        and(
          eq(appNotifications.userId, userId),
          eq(appNotifications.isRead, false)
        )
      );

    return result.length;
  } catch (error) {
    console.error('Error fetching unread count:', error);
    throw new Error('Failed to fetch unread count');
  }
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  try {
    await db
      .update(appNotifications)
      .set({ isRead: true })
      .where(eq(appNotifications.id, notificationId));

    return { success: true };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw new Error('Failed to mark notification as read');
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string) {
  try {
    await db
      .update(appNotifications)
      .set({ isRead: true })
      .where(
        and(
          eq(appNotifications.userId, userId),
          eq(appNotifications.isRead, false)
        )
      );

    return { success: true };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw new Error('Failed to mark all notifications as read');
  }
}