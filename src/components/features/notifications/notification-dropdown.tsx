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
  onFetchNotifications: (limit: number, offset: number) => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
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
          className="relative flex h-7 w-7 items-center justify-center hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Bell className="h-4 w-4 text-slate-500" />

          {/* Badge */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-80 p-0 rounded-lg border border-slate-200 bg-white shadow-lg"
      >
        {/* Header */}
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
          <h3 className="font-text-sm-semi-bold text-sm font-semibold text-slate-900">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <p className="font-text-xs-regular text-xs text-slate-500 mt-1">
              {unreadCount} unread
            </p>
          )}
        </div>

        {/* Notifications List - Scrollable Container */}
        <div className="max-h-96 overflow-y-auto">
          {isLoading && notifications.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <span className="font-text-sm-regular text-sm text-slate-500">
                Loading...
              </span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <span className="font-text-sm-regular text-sm text-slate-500">
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
          <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onMarkAllAsRead}
              className="w-full font-text-sm-medium text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200"
            >
              Mark all as read
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}