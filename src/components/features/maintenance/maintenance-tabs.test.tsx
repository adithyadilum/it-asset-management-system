import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { MaintenanceTabs } from './maintenance-tabs';

vi.mock('@/components/shared/data-table', () => ({
  DataTable: ({ data, emptyState }: any) => {
    if (!data || data.length === 0) {
      return <div>{emptyState?.title}</div>;
    }
    return (
      <div data-testid="data-table">
        {data.map((row: any, i: number) => (
          <div key={i}>{row.asset?.assetTag || row.assetId}</div>
        ))}
      </div>
    );
  },
}));

vi.mock('./active-repairs-grid', () => ({
  ActiveRepairsGrid: ({ tickets }: any) => (
    <div data-testid="active-repairs-grid">
      {tickets.map((t: any) => <div key={t.id}>{t.asset?.assetTag}</div>)}
    </div>
  ),
}));

vi.mock('./repair-history-grid', () => ({
  RepairHistoryGrid: ({ tickets }: any) => (
    <div data-testid="repair-history-grid">
      {tickets.map((t: any) => <div key={t.id}>{t.assetId}</div>)}
    </div>
  ),
}));

describe('MaintenanceTabs', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  const mockPendingTickets: any[] = [
    { id: 1, asset: { assetTag: 'TAG-1' }, reportedIssue: 'Broken screen', createdAt: '2023-01-01' }
  ];
  const mockActiveTickets: any[] = [
    { id: 2, asset: { assetTag: 'TAG-2' } }
  ];
  const mockHistoryTickets: any[] = [
    { id: 3, assetId: 'TAG-3' }
  ];

  const mockOnRowClick = vi.fn();
  const mockOnActiveRowClick = vi.fn();
  const mockOnSearchChange = vi.fn();

  const renderTabs = (props = {}) => {
    return render(
      <MaintenanceTabs
        pendingTickets={mockPendingTickets}
        activeRepairTickets={mockActiveTickets}
        repairHistoryTickets={mockHistoryTickets}
        isLoading={false}
        onRowClick={mockOnRowClick}
        onActiveRepairRowClick={mockOnActiveRowClick}
        searchTerm=""
        onSearchChange={mockOnSearchChange}
        {...props}
      />
    );
  };

  it('renders pending tab by default', () => {
    renderTabs();
    expect(screen.getByText('Pending Review (1)')).toBeInTheDocument();
    expect(screen.getByText('Active Repairs (1)')).toBeInTheDocument();
    expect(screen.getByText('Repair History')).toBeInTheDocument();
    
    // Shows data table for pending
    expect(screen.getByTestId('data-table')).toBeInTheDocument();
    expect(screen.getByText('TAG-1')).toBeInTheDocument();
  });

  it('filters pending tickets based on search term', () => {
    renderTabs({ searchTerm: 'Broken' });
    // Still shows TAG-1 because "Broken" matches "Broken screen"
    expect(screen.getByText('TAG-1')).toBeInTheDocument();

    const { rerender } = render(
      <MaintenanceTabs
        pendingTickets={mockPendingTickets}
        activeRepairTickets={mockActiveTickets}
        repairHistoryTickets={mockHistoryTickets}
        isLoading={false}
        onRowClick={mockOnRowClick}
        onActiveRepairRowClick={mockOnActiveRowClick}
        searchTerm="nonexistent"
        onSearchChange={mockOnSearchChange}
      />
    );

    // Now it should show empty state
    expect(screen.getByText('No pending maintenance tickets found')).toBeInTheDocument();
  });

  it('renders only history tab for FinanceAuditor', () => {
    renderTabs({ userRole: 'FinanceAuditor' });
    
    expect(screen.queryByText(/Pending Review/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Active Repairs/)).not.toBeInTheDocument();
    expect(screen.getByText('Repair History')).toBeInTheDocument();
    
    expect(screen.getByTestId('repair-history-grid')).toBeInTheDocument();
  });
});
