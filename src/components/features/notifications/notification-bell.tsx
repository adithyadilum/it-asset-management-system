'use client';

import { useNotifications } from '@/hooks/use-notifications';
import { NotificationDropdown } from './notification-dropdown';

export function NotificationBell() {
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    retry,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  return (
    <NotificationDropdown
      notifications={notifications}
      unreadCount={unreadCount}
      isLoading={isLoading}
      error={error}
      onRetry={retry}
      onFetchNotifications={fetchNotifications}
      onMarkAsRead={markAsRead}
      onMarkAllAsRead={markAllAsRead}
    />
  );
}
