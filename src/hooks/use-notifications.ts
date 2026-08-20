'use client';

import { useCallback } from 'react';
import useSWR from 'swr';
import {
  getNotificationSummary,
  getNotifications,
  markAllAsRead,
  markAsRead,
} from '@/actions/notifications';
import { clientEnv } from '@/lib/env.client';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  targetUrl: string | null;
  isRead: boolean;
  eventType: string;
  createdAt: Date;
}

interface NotificationSummary {
  notifications: Notification[];
  unreadCount: number;
}

export function useNotifications() {
  const {
    data: summary = { notifications: [], unreadCount: 0 },
    isLoading,
    error,
    mutate: mutateSummary,
  } = useSWR<NotificationSummary>(
    'notifications-summary',
    async () => {
      const data = await getNotificationSummary(10, 0);
      return data as NotificationSummary;
    },
    {
      refreshInterval: Math.max(
        clientEnv.NEXT_PUBLIC_NOTIFICATION_POLL_INTERVAL,
        60000
      ),
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 10000,
      errorRetryCount: 3,
    }
  );
  const { notifications, unreadCount } = summary;

  const fetchNotifications = useCallback(
    async (limit = 10, offset = 0) => {
      const data = await getNotifications(limit, offset);
      await mutateSummary(
        (current) => ({
          notifications: data as Notification[],
          unreadCount: current?.unreadCount ?? 0,
        }),
        false
      );
    },
    [mutateSummary]
  );

  const handleMarkAsRead = useCallback(
    async (notificationId: string) => {
      const previousSummary = summary;
      const wasUnread = notifications.some(
        (notification) =>
          notification.id === notificationId && !notification.isRead
      );

      await mutateSummary(
        {
          notifications: notifications.map((notification) =>
            notification.id === notificationId
              ? { ...notification, isRead: true }
              : notification
          ),
          unreadCount: wasUnread ? Math.max(0, unreadCount - 1) : unreadCount,
        },
        false
      );

      try {
        await markAsRead(notificationId);
        await mutateSummary();
      } catch (err) {
        await mutateSummary(previousSummary, false);
        console.error('Failed to mark notification as read:', err);
        throw err;
      }
    },
    [mutateSummary, notifications, summary, unreadCount]
  );

  const handleMarkAllAsRead = useCallback(async () => {
    const previousSummary = summary;
    await mutateSummary(
      {
        notifications: notifications.map((notification) => ({
          ...notification,
          isRead: true,
        })),
        unreadCount: 0,
      },
      false
    );

    try {
      await markAllAsRead();
      await mutateSummary();
    } catch (err) {
      await mutateSummary(previousSummary, false);
      console.error('Failed to mark all notifications as read:', err);
      throw err;
    }
  }, [mutateSummary, notifications, summary]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error: error ? (error as Error).message : null,
    fetchNotifications,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    fetchUnreadCount: async () => (await mutateSummary())?.unreadCount ?? 0,
  };
}
