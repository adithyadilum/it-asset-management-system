'use client';

import { useEffect, useState, useCallback } from 'react';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  targetUrl?: string;
  isRead: boolean;
  eventType: string;
  createdAt: Date;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/notifications/unread-count', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Failed to fetch unread count');

      const data = await response.json();
      setUnreadCount(data.unreadCount);
      setError(null);
    } catch (err) {
      console.error('Error fetching unread count:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  // Fetch all notifications
  const fetchNotifications = useCallback(async (limit = 10, offset = 0) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/v1/notifications?limit=${limit}&offset=${offset}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch notifications');

      const data = await response.json();
      setNotifications(
        data.data.map((notif: any) => ({
          ...notif,
          createdAt: new Date(notif.createdAt),
        }))
      );
      setError(null);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(
        `/api/v1/notifications/${notificationId}/read`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) throw new Error('Failed to mark notification as read');

      // Update local state
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, isRead: true } : notif
        )
      );

      // Refresh unread count
      await fetchUnreadCount();
      setError(null);
    } catch (err) {
      console.error('Error marking notification as read:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [fetchUnreadCount]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/notifications/read-all', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Failed to mark all as read');

      // Update local state
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, isRead: true }))
      );

      // Refresh unread count
      await fetchUnreadCount();
      setError(null);
    } catch (err) {
      console.error('Error marking all as read:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [fetchUnreadCount]);

  // Poll for updates every 30 seconds
  useEffect(() => {
    // Initial fetch
    fetchUnreadCount();

    // Set up polling interval (30 seconds)
    const intervalId = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    fetchUnreadCount,
  };
}