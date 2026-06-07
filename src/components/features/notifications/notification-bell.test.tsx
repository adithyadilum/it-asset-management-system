import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NotificationBell } from './notification-bell';
import { useNotifications } from '@/hooks/use-notifications';

vi.mock('@/hooks/use-notifications', () => ({
  useNotifications: vi.fn(),
}));

vi.mock('./notification-dropdown', () => ({
  NotificationDropdown: (props: any) => (
    <div data-testid="mock-dropdown">
      Unread: {props.unreadCount}
      Loading: {props.isLoading ? 'Yes' : 'No'}
      Count: {props.notifications.length}
    </div>
  )
}));

describe('NotificationBell', () => {
  it('passes hook return values to NotificationDropdown', () => {
    const mockHookReturn = {
      notifications: [{ id: '1', title: 'Test' }],
      unreadCount: 3,
      isLoading: false,
      fetchNotifications: vi.fn(),
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
    };
    
    (useNotifications as any).mockReturnValue(mockHookReturn);
    
    render(<NotificationBell />);
    
    expect(screen.getByTestId('mock-dropdown')).toBeInTheDocument();
    expect(screen.getByText(/Unread:\s*3/)).toBeInTheDocument();
    expect(screen.getByText(/Loading:\s*No/)).toBeInTheDocument();
    expect(screen.getByText(/Count:\s*1/)).toBeInTheDocument();
  });
});
