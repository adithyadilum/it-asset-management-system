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
  const {
    data: unreadCount = 0,
    mutate: mutateUnreadCount,
  } = useSWR('notifications-unread-count', getUnreadCount, {
    refreshInterval: 30000, // Poll every 30s
  });

  const {
    data: notifications = [],
    isLoading,
    error,
    mutate: mutateNotifications,
  } = useSWR('notifications-list', () => getNotifications(10, 0), {
    refreshInterval: 30000,
  });

  const fetchNotifications = useCallback(async (limit = 10, offset = 0) => {
    const data = await getNotifications(limit, offset);
    mutateNotifications(data, false);
  }, [mutateNotifications]);

  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    // Optimistic update
    mutateNotifications(
      (prev = []) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, isRead: true } : notif
        ),
      false
    );
    mutateUnreadCount((prev = 0) => Math.max(0, prev - 1), false);
    
    // Server Action
    await markAsRead(notificationId);
    
    // Re-validate
    mutateNotifications();
    mutateUnreadCount();
  }, [mutateNotifications, mutateUnreadCount]);

  const handleMarkAllAsRead = useCallback(async () => {
    // Optimistic update
    mutateNotifications(
      (prev = []) => prev.map((notif) => ({ ...notif, isRead: true })),
      false
    );
    mutateUnreadCount(0, false);
    
    // Server Action
    await markAllAsRead();
    
    // Re-validate
    mutateNotifications();
    mutateUnreadCount();
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