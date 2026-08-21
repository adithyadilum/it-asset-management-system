import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { RecentMaintenance } from './recent-maintenance';

vi.mock('@/actions/maintenance', () => ({
  getAssetMaintenanceHistory: vi.fn().mockResolvedValue([
    {
      id: 1,
      createdAt: '2023-01-01',
      ticketType: 'INTERNAL',
      reportedIssue: 'Screen replacement',
      status: 'COMPLETED',
    },
  ]),
}));

describe('RecentMaintenance', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  it('renders maintenance records', async () => {
    render(<RecentMaintenance assetTag="AST-1" />);
    await waitFor(() => {
      expect(screen.getByText('Screen replacement')).toBeInTheDocument();
    });
  });
});
