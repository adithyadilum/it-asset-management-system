import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { RepairHistoryGrid } from './repair-history-grid';

// Mock DataTable and TableSkeleton
vi.mock('@/components/shared/data-table', () => ({
  DataTable: ({ data, emptyState }: any) => {
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
        {data.map((row: any, i: number) => (
          <div key={i} data-testid={`row-${i}`}>
            {row.assetId} - {row.vendorName || 'Internal'}
          </div>
        ))}
      </div>
    );
  },
}));

vi.mock('@/components/shared/table-skeleton', () => ({
  TableSkeleton: () => <div data-testid="table-skeleton">Loading...</div>,
}));

describe('RepairHistoryGrid', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  const mockTickets: any[] = [
    {
      id: 1,
      assetId: 'TAG-001',
      vendorName: 'Apple Repair',
      actualCompletionDate: '2023-12-01T00:00:00Z',
      actualCost: 150.0,
      resolutionNotes: 'Screen replaced',
    },
    {
      id: 2,
      assetId: 'TAG-002',
      vendorName: null,
      actualCompletionDate: '2023-12-05T00:00:00Z',
      actualCost: 0,
      resolutionNotes: 'Reset software',
    },
  ];

  it('renders skeleton when loading', () => {
    render(<RepairHistoryGrid tickets={[]} isLoading={true} />);
    expect(screen.getByTestId('table-skeleton')).toBeInTheDocument();
  });

  it('renders empty state when no tickets', () => {
    render(<RepairHistoryGrid tickets={[]} isLoading={false} />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('No repair history found')).toBeInTheDocument();
  });

  it('renders table with tickets when data is provided', () => {
    render(<RepairHistoryGrid tickets={mockTickets} isLoading={false} />);
    expect(screen.getByTestId('data-table')).toBeInTheDocument();
    expect(screen.getByText('TAG-001 - Apple Repair')).toBeInTheDocument();
    expect(screen.getByText('TAG-002 - Internal')).toBeInTheDocument();
  });
});
