import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RecentMaintenance } from './recent-maintenance';

vi.mock('@/actions/maintenance', () => ({
  getAssetMaintenanceHistory: vi.fn().mockResolvedValue([
    { id: 1, createdAt: '2023-01-01', ticketType: 'INTERNAL', reportedIssue: 'Screen replacement', status: 'COMPLETED' }
  ])
}));

describe('RecentMaintenance', () => {
  it('renders maintenance records', async () => {
    render(<RecentMaintenance assetTag="AST-1" />);
    await waitFor(() => {
      expect(screen.getByText('Screen replacement')).toBeInTheDocument();
    });
  });
});
