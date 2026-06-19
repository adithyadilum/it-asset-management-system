import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DisposalReviewPanelWrapper } from './disposal-review-panel-wrapper';
import { getDisposalReviewDetails } from '@/actions/disposals/get-review-details';

vi.mock('@/actions/disposals/get-review-details', () => ({
  getDisposalReviewDetails: vi.fn(),
}));

vi.mock('./disposal-review-panel', () => ({
  DisposalReviewPanel: ({ isOpen, onReject, onApprove, serialNumber }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="disposal-review-panel">
        <div>Serial: {serialNumber}</div>
        <button onClick={onReject}>Reject Action</button>
        <button onClick={onApprove}>Approve Action</button>
      </div>
    );
  },
}));

vi.mock('./reject-disposal-dialog', () => ({
  RejectDisposalDialog: ({ isOpen, onSuccess }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="reject-dialog">
        <button onClick={onSuccess}>Complete Reject</button>
      </div>
    );
  },
}));

vi.mock('./execute-disposal-dialog', () => ({
  ExecuteDisposalDialog: ({ isOpen, onSuccess }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="execute-dialog">
        <button onClick={onSuccess}>Complete Execute</button>
      </div>
    );
  },
}));

describe('DisposalReviewPanelWrapper', () => {
  const mockOnClose = vi.fn();
  const mockRow: any = {
    id: 1,
    assetTag: 'TAG-1',
    assetName: 'Laptop',
    flaggedBy: 'User A',
    requestedAt: '2023-01-01',
    reason: 'Broken',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getDisposalReviewDetails as any).mockResolvedValue({
      serialNumber: 'SN-123',
      category: 'Laptop',
      brand: 'Dell',
      justification: 'Unrepairable',
    });
  });

  it('fetches data and renders panel correctly', async () => {
    render(
      <DisposalReviewPanelWrapper
        isOpen={true}
        onClose={mockOnClose}
        row={mockRow}
      />
    );

    await waitFor(() => {
      expect(getDisposalReviewDetails).toHaveBeenCalledWith(1);
      expect(screen.getByText('Serial: SN-123')).toBeInTheDocument();
    });
  });

  it('opens reject dialog and handles success', async () => {
    render(
      <DisposalReviewPanelWrapper
        isOpen={true}
        onClose={mockOnClose}
        row={mockRow}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Serial: SN-123')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Reject Action'));

    expect(screen.getByTestId('reject-dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Complete Reject'));

    expect(mockOnClose).toHaveBeenCalledWith(false);
  });

  it('opens execute dialog and handles success', async () => {
    render(
      <DisposalReviewPanelWrapper
        isOpen={true}
        onClose={mockOnClose}
        row={mockRow}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Serial: SN-123')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Approve Action'));

    expect(screen.getByTestId('execute-dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Complete Execute'));

    expect(mockOnClose).toHaveBeenCalledWith(false);
  });
});
