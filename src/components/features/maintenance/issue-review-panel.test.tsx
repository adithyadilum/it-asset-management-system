import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { IssueReviewPanel } from './issue-review-panel';

vi.mock('@/components/shared/slide-panel', () => ({
  SlidePanel: ({ isOpen, title, content, actions }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="slide-panel">
        <div>{title}</div>
        <div>{content}</div>
        <div>
          {actions.map((action: any) => (
            <button key={action.id} onClick={action.onClick} disabled={action.disabled}>
              {action.label}
            </button>
          ))}
        </div>
      </div>
    );
  },
}));

vi.mock('./resolve-internally-dialog', () => ({
  ResolveInternallyDialog: ({ isOpen, onConfirm }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="resolve-internally-dialog">
        <button onClick={() => onConfirm('Test note')}>Confirm Resolve</button>
      </div>
    );
  },
}));

vi.mock('./initiate-repair-dialog', () => ({
  InitiateRepairDialog: ({ isOpen, onConfirm }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="initiate-repair-dialog">
        <button onClick={() => onConfirm({ vendorId: '1' })}>Confirm Repair</button>
      </div>
    );
  },
}));

describe('IssueReviewPanel', () => {
  const mockOnClose = vi.fn();
  const mockOnResolveInternally = vi.fn();
  const mockOnInitiateRepair = vi.fn();

  const mockData: any = {
    ticket: {
      id: 1,
      asset: {
        assetTag: 'TAG-123',
        status: 'Needs Repair',
        createdAt: '2023-01-01',
      },
      category: { name: 'Laptop' },
      model: { name: 'Pro Book' },
      brand: { name: 'HP' },
      reportedBy: { name: 'Jane Doe' },
      reportedIssue: 'Screen flickering',
      createdAt: '2023-11-01',
    },
    warrantyStatus: 'Active',
    bookValue: 500,
    originalCost: 1000,
    totalTCO: 1200,
  };

  const mockVendors: any[] = [];

  it('renders skeleton when loading', () => {
    render(
      <IssueReviewPanel
        isOpen={true}
        onClose={mockOnClose}
        isLoading={true}
        data={null}
        vendors={mockVendors}
      />
    );
    // When loading, SlidePanel is rendered with empty actions and skeleton content
    expect(screen.getByTestId('slide-panel')).toBeInTheDocument();
    expect(screen.queryByText('Resolve Internally')).not.toBeInTheDocument();
  });

  it('renders content correctly', () => {
    render(
      <IssueReviewPanel
        isOpen={true}
        onClose={mockOnClose}
        isLoading={false}
        data={mockData}
        vendors={mockVendors}
      />
    );
    expect(screen.getByText('ID: TAG-123')).toBeInTheDocument();
    expect(screen.getAllByText('Pro Book')[0]).toBeInTheDocument();
    expect(screen.getByText('Screen flickering')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    // Currency format checks
    expect(screen.getByText('$500')).toBeInTheDocument();
    expect(screen.getByText('$1,000')).toBeInTheDocument();
  });

  it('handles actions correctly', () => {
    render(
      <IssueReviewPanel
        isOpen={true}
        onClose={mockOnClose}
        isLoading={false}
        data={mockData}
        vendors={mockVendors}
        onResolveInternally={mockOnResolveInternally}
        onInitiateRepair={mockOnInitiateRepair}
      />
    );

    // Click Resolve Internally
    const resolveBtn = screen.getByRole('button', { name: 'Resolve Internally' });
    fireEvent.click(resolveBtn);
    expect(screen.getByTestId('resolve-internally-dialog')).toBeInTheDocument();

    const confirmResolveBtn = screen.getByText('Confirm Resolve');
    fireEvent.click(confirmResolveBtn);
    expect(mockOnResolveInternally).toHaveBeenCalledWith('Test note');

    // Click Initiate Repair
    const repairBtn = screen.getByRole('button', { name: 'Initiate Repair' });
    fireEvent.click(repairBtn);
    expect(screen.getByTestId('initiate-repair-dialog')).toBeInTheDocument();

    const confirmRepairBtn = screen.getByText('Confirm Repair');
    fireEvent.click(confirmRepairBtn);
    expect(mockOnInitiateRepair).toHaveBeenCalledWith({ vendorId: '1' });
  });
});
