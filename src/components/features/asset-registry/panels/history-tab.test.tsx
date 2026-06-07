import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { HistoryTab } from './history-tab';

vi.mock('@/actions/audit-log', () => ({
  getAssetAuditHistory: vi.fn().mockResolvedValue({
    data: [{ id: '1', actionType: 'Create', performedAt: '2023-01-01', entityType: 'asset', entityId: '1', oldValue: null, newValue: null, ipAddress: null, performedBy: null }],
    hasMore: false
  })
}));

describe('HistoryTab', () => {
  it('renders history correctly', async () => {
    render(<HistoryTab assetId="1" />);
    await waitFor(() => {
      expect(screen.getByText(/Create/i)).toBeInTheDocument();
    });
  });
});
