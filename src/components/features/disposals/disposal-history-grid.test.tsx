import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DisposalHistoryGrid } from './disposal-history-grid';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/disposals',
  useSearchParams: () => new URLSearchParams(),
}));

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
            {row.assetTag} - {row.status}
          </div>
        ))}
      </div>
    );
  },
}));

describe('DisposalHistoryGrid', () => {
  const mockData: any[] = [
    {
      id: 1,
      assetId: '100',
      assetTag: 'TAG-1',
      category: 'Laptop',
      reason: 'Broken screen',
      flaggedBy: 'User A',
      disposedBy: 'User B',
      disposalDate: '2023-01-01',
      status: 'Completed',
      documentUrls: [],
    },
    {
      id: 2,
      assetId: '101',
      assetTag: 'TAG-2',
      category: 'Monitor',
      reason: 'Old',
      flaggedBy: 'User A',
      disposedBy: null,
      disposalDate: null,
      status: 'Rejected',
      documentUrls: [],
    },
  ];

  it('renders data correctly', () => {
    render(<DisposalHistoryGrid initialData={mockData} />);

    expect(screen.getByTestId('data-table')).toBeInTheDocument();
    expect(screen.getByText('TAG-1 - Completed')).toBeInTheDocument();
    expect(screen.getByText('TAG-2 - Rejected')).toBeInTheDocument();
  });

  it('renders empty state when no data', () => {
    render(<DisposalHistoryGrid initialData={[]} />);

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('No disposal history')).toBeInTheDocument();
  });

  it('calls onRowClick when a row is clicked', () => {
    const mockOnRowClick = vi.fn();
    render(<DisposalHistoryGrid initialData={mockData} onRowClick={mockOnRowClick} />);

    fireEvent.click(screen.getByTestId('row-0'));
    expect(mockOnRowClick).toHaveBeenCalledWith(mockData[0]);
  });
});
