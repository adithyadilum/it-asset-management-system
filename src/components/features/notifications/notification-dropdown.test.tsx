import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationDropdown } from './notification-dropdown';

// Mock NotificationItem
vi.mock('./notification-item', () => ({
  NotificationItem: ({ notification }: any) => (
    <div data-testid={`notif-item-${notification.id}`}>
      {notification.title}
    </div>
  )
}));

// Mock Dropdown Menu components to avoid portal issues in tests if any
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children, open, onOpenChange }: any) => (
    <div data-testid="dropdown-menu" data-state={open ? 'open' : 'closed'} onClick={() => onOpenChange?.(!open)}>
      {/* We intercept the trigger click to toggle open state manually */}
      {typeof children === 'function' ? children() : children}
    </div>
  ),
  DropdownMenuTrigger: ({ children, asChild }: any) => {
    // If asChild is true, we need to clone the child and add an onClick
    // However, since we don't have access to onOpenChange here directly,
    // we can dispatch a custom event or just let the button be clicked.
    // Actually, we can just render the child. We will fire the open change in tests directly.
    return children;
  },
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
}));

// For JSDOM, Radix UI Dialogs/Dropdowns require ResizeObserver to be mocked
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserver;

describe('NotificationDropdown', () => {
  const mockOnFetchNotifications = vi.fn();
  const mockOnMarkAsRead = vi.fn();
  const mockOnMarkAllAsRead = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    onFetchNotifications: mockOnFetchNotifications,
    onMarkAsRead: mockOnMarkAsRead,
    onMarkAllAsRead: mockOnMarkAllAsRead,
  };

  it('renders bell icon and badge correctly when unreadCount > 0', () => {
    render(<NotificationDropdown {...defaultProps} unreadCount={5} />);
    
    const trigger = screen.getByRole('button', { name: /Notifications/i });
    expect(trigger).toBeInTheDocument();
    
    expect(trigger).toHaveTextContent('5');
  });

  it('renders 99+ for unreadCount > 99', () => {
    render(<NotificationDropdown {...defaultProps} unreadCount={150} />);
    const trigger = screen.getByRole('button', { name: /Notifications/i });
    expect(trigger).toHaveTextContent('99+');
  });

  it('does not render badge if unreadCount is 0', () => {
    render(<NotificationDropdown {...defaultProps} unreadCount={0} />);
    const trigger = screen.getByRole('button', { name: /Notifications/i });
    expect(trigger).not.toHaveTextContent('0');
  });

  it('calls onFetchNotifications when opened for the first time if notifications is empty', async () => {
    render(<NotificationDropdown {...defaultProps} />);
    
    const trigger = screen.getByRole('button', { name: /Notifications/i });
    fireEvent.click(trigger);
    await waitFor(() => {
      expect(mockOnFetchNotifications).toHaveBeenCalledWith(10, 0);
    });
  });

  it('displays loading state', () => {
    render(<NotificationDropdown {...defaultProps} isLoading={true} />);
    
    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }));
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays empty state', () => {
    render(<NotificationDropdown {...defaultProps} />);
    
    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }));
    
    expect(screen.getByText('No notifications yet')).toBeInTheDocument();
  });

  it('renders list of notifications', () => {
    const notifications = [
      { id: '1', title: 'Test 1', message: 'Msg 1', createdAt: new Date().toISOString(), isRead: false },
      { id: '2', title: 'Test 2', message: 'Msg 2', createdAt: new Date().toISOString(), isRead: true },
    ] as any;
    
    render(<NotificationDropdown {...defaultProps} notifications={notifications} unreadCount={1} />);
    
    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }));
    
    expect(screen.getByTestId('notif-item-1')).toBeInTheDocument();
    expect(screen.getByTestId('notif-item-2')).toBeInTheDocument();
    expect(screen.getByText('1 unread')).toBeInTheDocument();
  });

  it('calls onMarkAllAsRead when Mark all as read button is clicked', () => {
    const notifications = [{ id: '1', title: 'Test 1', isRead: false }] as any;
    
    render(<NotificationDropdown {...defaultProps} notifications={notifications} unreadCount={1} />);
    
    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }));
    
    const markAllBtn = screen.getByRole('button', { name: /Mark all as read/i });
    fireEvent.click(markAllBtn);
    
    expect(mockOnMarkAllAsRead).toHaveBeenCalled();
  });
});
