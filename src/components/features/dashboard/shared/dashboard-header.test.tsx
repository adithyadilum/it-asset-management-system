import { CurrencyProvider } from '@/components/providers/currency-provider';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DashboardHeader } from './dashboard-header';
import { useDashboardRefresh } from './dashboard-refresh-provider';

// Mock context provider hook
vi.mock('./dashboard-refresh-provider', () => ({
  useDashboardRefresh: vi.fn(),
}));

// Mock QuickActionsMenu
vi.mock('./quick-actions-menu', () => ({
  QuickActionsMenu: () => <div data-testid="quick-actions">Quick Actions</div>
}));

describe('DashboardHeader', () => {
  const mockRefresh = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
    
    (useDashboardRefresh as any).mockReturnValue({
      lastRefreshedAt: new Date('2024-01-01T11:59:50Z'), // 10 seconds ago
      refresh: mockRefresh,
    });
  });

  afterEach(async () => {
    // Restore real timers so the flush setTimeout doesn't hang indefinitely
    vi.useRealTimers();
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  it('renders greeting and date correctly', () => {
    render(<CurrencyProvider initialCurrency="USD"><DashboardHeader userName="John Doe" userRole="GlobalAdmin" /></CurrencyProvider>);
    
    expect(screen.getByText('Welcome back, John')).toBeInTheDocument();
    expect(screen.getByTestId('quick-actions')).toBeInTheDocument();
  });

  it('calls refresh when refresh button is clicked', () => {
    render(<CurrencyProvider initialCurrency="USD"><DashboardHeader userName="John Doe" userRole="GlobalAdmin" /></CurrencyProvider>);
    
    const refreshBtn = screen.getByRole('button', { name: /Refresh dashboard data/i });
    fireEvent.click(refreshBtn);
    
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('displays relative time based on lastRefreshedAt', async () => {
    render(<CurrencyProvider initialCurrency="USD"><DashboardHeader userName="John Doe" userRole="GlobalAdmin" /></CurrencyProvider>);
    
    // advance timers by 1 tick so the timeout in useEffect executes and updates state
    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(screen.getByText(/Last refreshed 10s ago/i)).toBeInTheDocument();
    
    // Fast-forward 1 minute
    act(() => {
      vi.advanceTimersByTime(60000);
    });
    
    expect(screen.getByText(/Last refreshed 1m ago/i)).toBeInTheDocument();
  });
});
