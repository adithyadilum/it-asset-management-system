import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { DisposalsLayout } from './disposals-layout';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/disposals',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/components/ui/sidebar', () => ({
  useSidebar: () => ({ setOpen: vi.fn() }),
}));

vi.mock('./pending-disposals-grid', () => ({
  PendingDisposalsGrid: () => <div data-testid="pending-grid">Pending</div>,
}));

vi.mock('./disposal-history-grid', () => ({
  DisposalHistoryGrid: () => <div data-testid="history-grid">History</div>,
}));

vi.mock('@/components/features/disposals/disposal-review-panel-wrapper', () => ({
  DisposalReviewPanelWrapper: () => <div data-testid="review-wrapper">Review</div>,
}));

vi.mock('./disposal-asset-detail-panel', () => ({
  DisposalAssetDetailPanel: () => <div data-testid="detail-panel">Detail</div>,
}));

describe('DisposalsLayout', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  it('renders pending and history tabs for standard user', () => {
    render(<DisposalsLayout pendingData={[]} historyData={[]} />);

    expect(screen.getByText('Disposals')).toBeInTheDocument();
    expect(screen.getByText(/Pending Disposal/)).toBeInTheDocument();
    expect(screen.getByText('Disposal History')).toBeInTheDocument();
    
    // Default tab is pending
    expect(screen.getByTestId('pending-grid')).toBeInTheDocument();
  });

  it('renders only history tab for FinanceAuditor', () => {
    render(<DisposalsLayout pendingData={[]} historyData={[]} userRole="FinanceAuditor" />);

    expect(screen.queryByText(/Pending Disposal/)).not.toBeInTheDocument();
    expect(screen.getByText('Disposal History')).toBeInTheDocument();
    
    // Default tab is history
    expect(screen.getByTestId('history-grid')).toBeInTheDocument();
  });
});
