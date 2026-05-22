'use client';

import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import type { Notification } from '@/hooks/use-notifications';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => Promise<void>;
}

export function NotificationItem({
  notification,
  onMarkAsRead,
}: NotificationItemProps) {
  const router = useRouter();

  const handleClick = async () => {
    // Mark as read
    if (!notification.isRead) {
      await onMarkAsRead(notification.id);
    }

    // Navigate to target URL if available
    if (notification.targetUrl) {
      router.push(notification.targetUrl);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-full text-left border-b border-slate-100 px-4 py-3 transition-colors focus:outline-none ${
        !notification.isRead
          ? 'bg-blue-50 hover:bg-blue-100 focus:bg-blue-100/80'
          : 'bg-white hover:bg-slate-50 focus:bg-slate-50'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-text-sm-semi-bold text-sm font-semibold text-slate-900 truncate">
            {notification.title}
          </p>
          <p className="font-text-sm-regular text-sm text-slate-700 line-clamp-2 mt-1">
            {notification.message}
          </p>
          <span className="font-text-xs-regular text-xs text-slate-500 mt-2 inline-block">
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </span>
        </div>

        {!notification.isRead && (
          <div className="flex-shrink-0 ml-2">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
          </div>
        )}
      </div>
    </button>
  );
}