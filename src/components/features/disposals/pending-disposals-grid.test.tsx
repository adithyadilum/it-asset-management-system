import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PendingDisposalsGrid } from './pending-disposals-grid';

vi.mock('@/components/shared/data-table', () => ({
  DataTable: ({ data, emptyState, onRowClick, selectionActions }: any) => {
    if (!data || data.length === 0) {
      return (
        <div data-testid="empty-state">
          <h3>{emptyState?.title}</h3>
          <p>{emptyState?.description}</p>
        </div>
      );
    }
    return (
      <div data-testid="data-table">
        {selectionActions?.map((action: any) => (
          <button key={action.id} onClick={action.onClick}>{action.label}</button>
        ))}
        {data.map((row: any, i: number) => (
          <div key={i} data-testid={`row-${i}`} onClick={() => onRowClick(row)}>
            {row.assetTag}
          </div>
        ))}
      </div>
    );
  },
}));

vi.mock('./execute-disposal-dialog', () => ({
  ExecuteDisposalDialog: ({ isOpen }: any) => {
    if (!isOpen) return null;
    return <div data-testid="execute-dialog">Execute</div>;
  },
}));

vi.mock('./reject-disposal-dialog', () => ({
  RejectDisposalDialog: ({ isOpen }: any) => {
    if (!isOpen) return null;
    return <div data-testid="reject-dialog">Reject</div>;
  },
}));

describe('PendingDisposalsGrid', () => {
  const mockData: any[] = [
    {
      id: 1,
      assetId: '100',
      assetTag: 'TAG-1',
      assetName: 'Laptop',
      flaggedBy: 'User A',
      reason: 'Broken',
      requestedAt: new Date(),
    },
    {
      id: 2,
      assetId: '101',
      assetTag: 'TAG-2',
      assetName: 'Monitor',
      flaggedBy: 'User B',
      reason: 'Old',
      requestedAt: new Date(new Date().getTime() - 40 * 24 * 60 * 60 * 1000), // 40 days ago
    },
  ];

  it('renders data correctly', () => {
    render(<PendingDisposalsGrid initialData={mockData} onRowClick={vi.fn()} />);

    expect(screen.getByTestId('data-table')).toBeInTheDocument();
    expect(screen.getByText('TAG-1')).toBeInTheDocument();
    expect(screen.getByText('TAG-2')).toBeInTheDocument();
  });

  it('renders empty state when no data', () => {
    render(<PendingDisposalsGrid initialData={[]} onRowClick={vi.fn()} />);

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('No pending disposals')).toBeInTheDocument();
  });

  it('calls onRowClick when a row is clicked', () => {
    const mockOnRowClick = vi.fn();
    render(<PendingDisposalsGrid initialData={mockData} onRowClick={mockOnRowClick} />);

    fireEvent.click(screen.getByTestId('row-0'));
    expect(mockOnRowClick).toHaveBeenCalledWith(mockData[0]);
  });

  it('opens bulk action dialogs', () => {
    render(<PendingDisposalsGrid initialData={mockData} onRowClick={vi.fn()} />);

    fireEvent.click(screen.getByText('Dispose Selected'));
    expect(screen.getByTestId('execute-dialog')).toBeInTheDocument();

    // The execute dialog is open, let's close it (by rendering again to clear or just checking reject)
    // Actually our mock doesn't provide a way to close, but we can just check if reject opens too.
    fireEvent.click(screen.getByText('Reject Selected'));
    expect(screen.getByTestId('reject-dialog')).toBeInTheDocument();
  });
});
