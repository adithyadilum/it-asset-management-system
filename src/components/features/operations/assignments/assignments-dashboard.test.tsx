import { CurrencyProvider } from '@/components/providers/currency-provider';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssignmentsDashboard } from './assignments-dashboard';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
  useSearchParams: vi.fn(),
}));

vi.mock('@/actions/assignments', () => ({
  sendAssignmentReminderAction: vi.fn(),
  requestAssetReturnAction: vi.fn(),
  markAssetReceivedAction: vi.fn(),
}));

vi.mock('./assignments-panels', () => ({
  AssignmentsPanels: ({ isOpen }: any) => (
    isOpen ? <div data-testid="assignments-panels">Panels Open</div> : null
  ),
}));

vi.mock('./multi-asset-assignment-modal', () => ({
  MultiAssetAssignmentModal: ({ isOpen }: any) => (
    isOpen ? <div data-testid="multi-asset-assignment-modal">Multi Modal Open</div> : null
  ),
}));

vi.mock('./process-return-modal', () => ({
  ProcessReturnModal: ({ isOpen }: any) => (
    isOpen ? <div data-testid="process-return-modal">Return Modal Open</div> : null
  ),
}));

// Mock DataTable since it's complex
vi.mock('@/components/shared/data-table', () => ({
  DataTable: ({ data }: any) => (
    <div data-testid="data-table">
      Rows: {data.length}
    </div>
  ),
}));

describe('AssignmentsDashboard', () => {
  const mockData: any = {
    available: [
      { id: '1', assetTag: 'TAG-1', category: 'Laptop', status: 'In Storage', pillar: 'IT', state: 'available', createdAt: '2023-01-01', updatedAt: '2023-01-01' }
    ],
    assigned: [
      { id: '2', assetTag: 'TAG-2', category: 'Phone', status: 'Assigned', pillar: 'HR', state: 'assigned', assignedTo: 'John', assignmentId: 101, createdAt: '2023-01-01', updatedAt: '2023-01-01' }
    ],
    returned: [
      { id: '3', assetTag: 'TAG-3', category: 'Monitor', status: 'Returned', pillar: 'IT', state: 'returned', assignmentId: 102, createdAt: '2023-01-01', updatedAt: '2023-01-01' }
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({ push: vi.fn() });
    (usePathname as any).mockReturnValue('/assignments');
    
    const searchParams = new URLSearchParams();
    (useSearchParams as any).mockReturnValue(searchParams);
  });

  const renderDashboard = () => {
    return render(<CurrencyProvider initialCurrency="USD"><AssignmentsDashboard data={mockData} /></CurrencyProvider>);
  };

  it('renders correctly with tabs', () => {
    renderDashboard();
    
    expect(screen.getByText('Assignments and Returns')).toBeInTheDocument();
    
    // Module tabs should be rendered
    expect(screen.getByText('Available Assets')).toBeInTheDocument();
    expect(screen.getByText('Assigned Assets')).toBeInTheDocument();
    expect(screen.getByText('Returned Assets')).toBeInTheDocument();
    
    // Should render DataTable
    const tables = screen.getAllByTestId('data-table');
    expect(tables.length).toBeGreaterThan(0);
  });

  it('opens panel if URL specifies panel=record', () => {
    const searchParams = new URLSearchParams('panel=record&id=TAG-1');
    (useSearchParams as any).mockReturnValue(searchParams);
    
    renderDashboard();
    
    expect(screen.getByTestId('assignments-panels')).toBeInTheDocument();
  });
});
