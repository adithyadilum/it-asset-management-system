'use client';

import { useCallback } from 'react';
import useSWR from 'swr';
import {
  getNotifications,
  getUnreadCount,
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

export function useNotifications() {
  const { data: unreadCount = 0, mutate: mutateUnreadCount } = useSWR<number>(
    'notifications-unread-count',
    getUnreadCount,
    {
      refreshInterval: Math.max(clientEnv.NEXT_PUBLIC_NOTIFICATION_POLL_INTERVAL, 60000),
      refreshWhenHidden: false,
      refreshWhenOffline: false,
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
  } = useSWR<Notification[]>('notifications-list', async () => {
    const data = await getNotifications(10, 0);
    return data as Notification[];
  }, {
    revalidateOnFocus: false, // Prevents hammering the DB when tabbing back
  });

  const fetchNotifications = useCallback(
    async (limit = 10, offset = 0) => {
      const data = await getNotifications(limit, offset);
      mutateNotifications(data as Notification[], false);
    },
    [mutateNotifications]
  );

  const handleMarkAsRead = useCallback(
    async (notificationId: string) => {
      const promise = markAsRead(notificationId);

      try {
        await Promise.all([
          mutateNotifications(promise as unknown as Promise<Notification[]>, {
            optimisticData: (prev = []) =>
              prev.map((notif) =>
                notif.id === notificationId ? { ...notif, isRead: true } : notif
              ),
            rollbackOnError: true,
            populateCache: false,
            revalidate: true,
          }),
          mutateUnreadCount(promise as unknown as Promise<number>, {
            optimisticData: (prev = 0) => Math.max(0, prev - 1),
            rollbackOnError: true,
            populateCache: false,
            revalidate: true,
          }),
        ]);
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
        throw err;
      }
    },
    [mutateNotifications, mutateUnreadCount]
  );

  const handleMarkAllAsRead = useCallback(async () => {
    const promise = markAllAsRead();

    try {
      await Promise.all([
        mutateNotifications(promise as unknown as Promise<Notification[]>, {
          optimisticData: (prev = []) =>
            prev.map((notif) => ({ ...notif, isRead: true })),
          rollbackOnError: true,
          populateCache: false,
          revalidate: true,
        }),
        mutateUnreadCount(promise as unknown as Promise<number>, {
          optimisticData: 0,
          rollbackOnError: true,
          populateCache: false,
          revalidate: true,
        }),
      ]);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      throw err;
    }
  }, [mutateNotifications, mutateUnreadCount]);

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
