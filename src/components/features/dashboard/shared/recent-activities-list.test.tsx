import { CurrencyProvider } from '@/components/providers/currency-provider';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { RecentActivitiesList } from './recent-activities-list';

describe('RecentActivitiesList', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  it('renders recent activities list', () => {
    const mockActivities = [
      { id: '1', text: 'John Doe assigned a Laptop', actionType: 'assigned', performedAt: '2023-01-01T00:00:00Z' }
    ];
    
    render(<CurrencyProvider initialCurrency="USD"><RecentActivitiesList activities={mockActivities as any} /></CurrencyProvider>);
    
    expect(screen.getByText(/John Doe assigned a Laptop/i)).toBeInTheDocument();
  });
});
