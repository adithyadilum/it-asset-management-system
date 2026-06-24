'use client';

import { useCallback } from 'react';
import useSWR from 'swr';
import {
  getNotifications,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
} from '@/actions/notifications';

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

export function useNotifications() {
  const { data: unreadCount = 0, mutate: mutateUnreadCount } = useSWR(
    'notifications-unread-count',
    getUnreadCount,
    {
      refreshInterval: 30000, // Poll every 30 seconds while the tab is active
      revalidateOnFocus: true, // Instantly fetch when the user clicks back into this tab
      revalidateOnReconnect: true, // Instantly fetch if the internet drops and comes back
      dedupingInterval: 10000, // Throttle requests: ignore duplicate calls within 10 seconds
      errorRetryCount: 3, // Stop retrying after 3 fails to prevent infinite error loops
    }
  );

  const {
    data: notifications = [],
    isLoading,
    error,
    mutate: mutateNotifications,
  } = useSWR('notifications-list', () => getNotifications(10, 0), {
    revalidateOnFocus: false, // Prevents hammering the DB when tabbing back
  });

  const fetchNotifications = useCallback(
    async (limit = 10, offset = 0) => {
      const data = await getNotifications(limit, offset);
      mutateNotifications(data, false);
    },
    [mutateNotifications]
  );

  const handleMarkAsRead = useCallback(
    async (notificationId: string) => {
      const prevNotifications = notifications;
      const prevUnreadCount = unreadCount;

      // Optimistic update
      mutateNotifications(
        (prev = []) =>
          prev.map((notif) =>
            notif.id === notificationId ? { ...notif, isRead: true } : notif
          ),
        false
      );
      mutateUnreadCount((prev = 0) => Math.max(0, prev - 1), false);

      try {
        // Server Action
        await markAsRead(notificationId);
      } catch (err) {
        // Rollback on failure
        mutateNotifications(prevNotifications, false);
        mutateUnreadCount(prevUnreadCount, false);
        throw err;
      }

      // Re-validate
      mutateNotifications();
      mutateUnreadCount();
    },
    [notifications, unreadCount, mutateNotifications, mutateUnreadCount]
  );

  const handleMarkAllAsRead = useCallback(async () => {
    const prevNotifications = notifications;
    const prevUnreadCount = unreadCount;

    // Optimistic update
    mutateNotifications(
      (prev = []) => prev.map((notif) => ({ ...notif, isRead: true })),
      false
    );
    mutateUnreadCount(0, false);

    try {
      // Server Action
      await markAllAsRead();
    } catch (err) {
      // Rollback on failure
      mutateNotifications(prevNotifications, false);
      mutateUnreadCount(prevUnreadCount, false);
      throw err;
    }

    // Re-validate
    mutateNotifications();
    mutateUnreadCount();
  }, [notifications, unreadCount, mutateNotifications, mutateUnreadCount]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error: error ? (error as Error).message : null,
    fetchNotifications,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    fetchUnreadCount: mutateUnreadCount,
  };
}
