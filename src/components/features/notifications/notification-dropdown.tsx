'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { useState } from 'react';
import type { Notification } from '@/hooks/use-notifications';
import { NotificationItem } from './notification-item';

interface NotificationDropdownProps {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => Promise<void>;
  onFetchNotifications: (limit: number, offset: number) => Promise<void>;
  onMarkAsRead: (id: string) => Promise<void>;
  onMarkAllAsRead: () => Promise<void>;
}

export function NotificationDropdown({
  notifications,
  unreadCount,
  isLoading,
  error,
  onRetry,
  onFetchNotifications,
  onMarkAsRead,
  onMarkAllAsRead,
}: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const loadError = actionError ?? error;

  const recover = async (operation: () => Promise<void>) => {
    setBusy(true);
    setActionError(null);
    try {
      await operation();
    } catch {
      setActionError(
        'Notifications are temporarily unavailable. Please try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && notifications.length === 0) {
      void recover(onRetry ?? (() => onFetchNotifications(10, 0)));
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-7 w-7 items-center justify-center hover:bg-muted rounded-lg transition-colors"
        >
          <Bell className="h-4 w-4 text-muted-foreground" />

          {/* Badge */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-bold text-primary-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-80 p-0 rounded-lg border border-border bg-background shadow-lg"
      >
        {/* Header */}
        <div className="border-b border-border bg-muted px-4 py-3">
          <h3 className="font-text-sm-semi-bold text-sm font-semibold text-foreground">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <p className="font-text-xs-regular text-xs text-muted-foreground mt-1">
              {unreadCount} unread
            </p>
          )}
        </div>

        {/* Notifications List - Scrollable Container */}
        {loadError ? (
          <div
            role="alert"
            className="space-y-2 border-b px-4 py-3 text-sm text-muted-foreground"
          >
            <p>{loadError}</p>
            <Button
              variant="outline"
              size="sm"
              disabled={busy || isLoading}
              onClick={() =>
                void recover(onRetry ?? (() => onFetchNotifications(10, 0)))
              }
            >
              {busy ? 'Trying again...' : 'Try again'}
            </Button>
          </div>
        ) : null}
        <div className="max-h-96 overflow-y-auto">
          {isLoading && notifications.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <span className="font-text-sm-regular text-sm text-muted-foreground">
                Loading...
              </span>
            </div>
          ) : notifications.length === 0 && !loadError ? (
            <div className="flex items-center justify-center py-8">
              <span className="font-text-sm-regular text-sm text-muted-foreground">
                No notifications yet
              </span>
            </div>
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={(id) => recover(() => onMarkAsRead(id))}
              />
            ))
          )}
        </div>

        {/* Footer - Mark all as read button */}
        {notifications.length > 0 && unreadCount > 0 && (
          <div className="border-t border-border bg-muted px-4 py-3">
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => void recover(onMarkAllAsRead)}
              className="w-full font-text-sm-medium text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              Mark all as read
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
