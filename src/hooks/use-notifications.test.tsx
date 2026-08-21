import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getNotificationSummary,
  getNotifications,
} from '@/actions/notifications';
import { useNotifications } from './use-notifications';

vi.mock('@/actions/notifications', () => ({
  getNotificationSummary: vi.fn(),
  getNotifications: vi.fn(),
  markAllAsRead: vi.fn(),
  markAsRead: vi.fn(),
}));

vi.mock('@/lib/env.client', () => ({
  clientEnv: { NEXT_PUBLIC_NOTIFICATION_POLL_INTERVAL: 60000 },
}));

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getNotificationSummary).mockResolvedValue({
      notifications: [
        {
          id: 'notification-id',
          userId: 'user-id',
          title: 'Assigned asset',
          message: 'A laptop was assigned.',
          targetUrl: '/portal',
          isRead: false,
          eventType: 'ASSIGNMENT_PENDING',
          createdAt: new Date('2026-07-14T00:00:00Z'),
        },
      ],
      unreadCount: 2,
    });
  });

  it('bootstraps the list and unread count with one action', async () => {
    const { result } = renderHook(() => useNotifications(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.unreadCount).toBe(2));

    expect(result.current.notifications).toHaveLength(1);
    expect(getNotificationSummary).toHaveBeenCalledTimes(1);
    expect(getNotifications).not.toHaveBeenCalled();
  });
});
