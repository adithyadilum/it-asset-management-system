import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IssueReviewPanelWrapper } from './issue-review-panel-wrapper';
import { getTicketForIssueReview, getVendors, resolveIssueInternally, initiateVendorRepair } from '@/actions/maintenance';

vi.mock('@/actions/maintenance', () => ({
  getTicketForIssueReview: vi.fn(),
  getVendors: vi.fn(),
  resolveIssueInternally: vi.fn(),
  initiateVendorRepair: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('./issue-review-panel', () => ({
  IssueReviewPanel: ({ isOpen, data, onResolveInternally, onInitiateRepair }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="issue-review-panel">
        <div>Data: {data ? 'Loaded' : 'Loading'}</div>
        <button onClick={() => onResolveInternally('Test note')}>Resolve Internally</button>
        <button onClick={() => onInitiateRepair({ vendorId: '1' })}>Initiate Repair</button>
      </div>
    );
  },
}));

describe('IssueReviewPanelWrapper', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    (getTicketForIssueReview as any).mockResolvedValue({
      ticket: { id: 1, asset: { id: 100 } }
    });
    
    (getVendors as any).mockResolvedValue([
      { id: 1, companyName: 'Vendor A' }
    ]);
  });

  it('fetches data when opened with a ticketId', async () => {
    render(
      <IssueReviewPanelWrapper
        isOpen={true}
        onClose={mockOnClose}
        ticketId={1}
      />
    );

    await waitFor(() => {
      expect(getTicketForIssueReview).toHaveBeenCalledWith(1);
      expect(getVendors).toHaveBeenCalled();
      expect(screen.getByText('Data: Loaded')).toBeInTheDocument();
    });
  });

  it('handles resolve internally successfully', async () => {
    (resolveIssueInternally as any).mockResolvedValue(true);
    
    render(
      <IssueReviewPanelWrapper
        isOpen={true}
        onClose={mockOnClose}
        ticketId={1}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Data: Loaded')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Resolve Internally'));

    await waitFor(() => {
      expect(resolveIssueInternally).toHaveBeenCalledWith(1, 'Test note');
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('handles initiate repair successfully', async () => {
    (initiateVendorRepair as any).mockResolvedValue(true);
    
    render(
      <IssueReviewPanelWrapper
        isOpen={true}
        onClose={mockOnClose}
        ticketId={1}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Data: Loaded')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Initiate Repair'));

    await waitFor(() => {
      expect(initiateVendorRepair).toHaveBeenCalledWith(
        1,
        100,
        '1',
        undefined,
        undefined,
        undefined,
        undefined
      );
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
