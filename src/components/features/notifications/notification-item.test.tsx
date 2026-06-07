import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationItem } from './notification-item';
import { useRouter } from 'next/navigation';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

describe('NotificationItem', () => {
  const mockOnMarkAsRead = vi.fn();

  const baseNotification = {
    id: 'notif-1',
    title: 'Asset Assigned',
    message: 'You have been assigned a MacBook Pro',
    createdAt: new Date().toISOString(),
    isRead: false,
    targetUrl: '/assets/macbook',
    userId: 'user-1',
    eventType: 'SYSTEM_ALERT'
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(
      <NotificationItem 
        notification={baseNotification} 
        onMarkAsRead={mockOnMarkAsRead} 
      />
    );
    
    expect(screen.getByText('Asset Assigned')).toBeInTheDocument();
    expect(screen.getByText('You have been assigned a MacBook Pro')).toBeInTheDocument();
  });

  it('calls onMarkAsRead when an unread notification is clicked', async () => {
    const mockRouterPush = vi.fn();
    (useRouter as any).mockReturnValue({ push: mockRouterPush });
    
    render(
      <NotificationItem 
        notification={baseNotification} 
        onMarkAsRead={mockOnMarkAsRead} 
      />
    );
    
    fireEvent.click(screen.getByRole('button'));
    
    await vi.waitFor(() => {
      expect(mockOnMarkAsRead).toHaveBeenCalledWith('notif-1');
      expect(mockRouterPush).toHaveBeenCalledWith('/assets/macbook');
    });
  });

  it('does not call onMarkAsRead if notification is already read', async () => {
    const mockRouterPush = vi.fn();
    (useRouter as any).mockReturnValue({ push: mockRouterPush });
    
    const readNotification = { ...baseNotification, isRead: true };
    
    render(
      <NotificationItem 
        notification={readNotification} 
        onMarkAsRead={mockOnMarkAsRead} 
      />
    );
    
    fireEvent.click(screen.getByRole('button'));
    
    await vi.waitFor(() => {
      expect(mockOnMarkAsRead).not.toHaveBeenCalled();
      expect(mockRouterPush).toHaveBeenCalledWith('/assets/macbook');
    });
  });

  it('does not call router.push if targetUrl is missing', async () => {
    const mockRouterPush = vi.fn();
    (useRouter as any).mockReturnValue({ push: mockRouterPush });
    
    const noUrlNotification = { ...baseNotification, targetUrl: undefined };
    
    render(
      <NotificationItem 
        notification={noUrlNotification as any} 
        onMarkAsRead={mockOnMarkAsRead} 
      />
    );
    
    fireEvent.click(screen.getByRole('button'));
    
    await vi.waitFor(() => {
      expect(mockOnMarkAsRead).toHaveBeenCalledWith('notif-1');
      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });
});
