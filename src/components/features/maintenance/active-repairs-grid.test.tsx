import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ActiveRepairsGrid } from './active-repairs-grid';

// Mock DataTable and TableSkeleton
vi.mock('@/components/shared/data-table', () => ({
  DataTable: ({ data, emptyState, onRowClick }: any) => {
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
          <div key={i} data-testid={`row-${i}`} onClick={() => onRowClick(row)}>
            {row.asset.assetTag}
          </div>
        ))}
      </div>
    );
  },
}));

vi.mock('@/components/shared/table-skeleton', () => ({
  TableSkeleton: () => <div data-testid="table-skeleton">Loading...</div>,
}));

describe('ActiveRepairsGrid', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  const mockTickets: any[] = [
    {
      id: 1,
      asset: { assetTag: 'TAG-001' },
      vendorName: 'Apple Repair',
      rmaNumber: 'RMA-123',
      estimatedReturnDate: '2023-12-01T00:00:00Z',
      estimatedCost: 150.0,
    },
    {
      id: 2,
      asset: { assetTag: 'TAG-002' },
      vendorName: 'Dell Services',
      rmaNumber: null,
      estimatedReturnDate: '2023-12-05T00:00:00Z',
      estimatedCost: 200.0,
    },
  ];

  const mockOnRowClick = vi.fn();

  it('renders skeleton when loading', () => {
    render(
      <ActiveRepairsGrid
        tickets={[]}
        isLoading={true}
        onRowClick={mockOnRowClick}
      />
    );

    expect(screen.getByTestId('table-skeleton')).toBeInTheDocument();
  });

  it('renders empty state when no tickets', () => {
    render(
      <ActiveRepairsGrid
        tickets={[]}
        isLoading={false}
        onRowClick={mockOnRowClick}
      />
    );

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('No active repairs found')).toBeInTheDocument();
  });

  it('renders table with tickets when data is provided', () => {
    render(
      <ActiveRepairsGrid
        tickets={mockTickets}
        isLoading={false}
        onRowClick={mockOnRowClick}
      />
    );

    expect(screen.getByTestId('data-table')).toBeInTheDocument();
    expect(screen.getByText('TAG-001')).toBeInTheDocument();
    expect(screen.getByText('TAG-002')).toBeInTheDocument();
  });

  it('calls onRowClick when a row is clicked', () => {
    render(
      <ActiveRepairsGrid
        tickets={mockTickets}
        isLoading={false}
        onRowClick={mockOnRowClick}
      />
    );

    fireEvent.click(screen.getByTestId('row-0'));
    expect(mockOnRowClick).toHaveBeenCalledWith(mockTickets[0]);
  });
});
