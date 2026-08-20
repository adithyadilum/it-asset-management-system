import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { AdminMobileMetrics } from './admin-mobile-metrics';

vi.mock('@/actions/mobile', () => ({
  getAdminMobileMetrics: vi.fn().mockResolvedValue({
    assignedAssetCount: 10,
    pendingApprovalsCount: 5,
    recentActivities: [],
  }),
}));

describe('AdminMobileMetrics', () => {
  afterEach(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });
  it('renders correctly', async () => {
    const ui = await AdminMobileMetrics();
    render(ui);
    expect(screen.getByText('Quick Metrics')).toBeInTheDocument();
  });
});
