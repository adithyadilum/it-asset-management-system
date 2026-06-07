import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RecentActivitiesList } from './recent-activities-list';

describe('RecentActivitiesList', () => {
  it('renders recent activities list', () => {
    const mockActivities = [
      { id: '1', text: 'John Doe assigned a Laptop', actionType: 'assigned', performedAt: '2023-01-01T00:00:00Z' }
    ];
    
    render(<RecentActivitiesList activities={mockActivities as any} />);
    
    expect(screen.getByText(/John Doe assigned a Laptop/i)).toBeInTheDocument();
  });
});
