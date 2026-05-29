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
  onFetchNotifications: (limit: number, offset: number) => Promise<void>;
  onMarkAsRead: (id: string) => Promise<void>;
  onMarkAllAsRead: () => Promise<void>;
}

export function NotificationDropdown({
  notifications,
  unreadCount,
  isLoading,
  onFetchNotifications,
  onMarkAsRead,
  onMarkAllAsRead,
}: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && notifications.length === 0) {
      onFetchNotifications(10, 0);
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
        <div className="max-h-96 overflow-y-auto">
          {isLoading && notifications.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <span className="font-text-sm-regular text-sm text-muted-foreground">
                Loading...
              </span>
            </div>
          ) : notifications.length === 0 ? (
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
                onMarkAsRead={onMarkAsRead}
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
              onClick={onMarkAllAsRead}
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