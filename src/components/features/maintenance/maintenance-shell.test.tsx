import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MaintenanceShell } from './maintenance-shell';
import { getPendingMaintenanceTickets, getActiveRepairTickets, getRepairHistory, completeRepairTicket } from '@/actions/maintenance';

vi.mock('@/actions/maintenance', () => ({
  getPendingMaintenanceTickets: vi.fn(),
  getActiveRepairTickets: vi.fn(),
  getRepairHistory: vi.fn(),
  completeRepairTicket: vi.fn(),
}));

vi.mock('@/components/ui/sidebar', () => ({
  useSidebar: () => ({ setOpen: vi.fn() }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/components/features/maintenance/maintenance-tabs', () => ({
  MaintenanceTabs: ({ onRowClick, onActiveRepairRowClick }: any) => (
    <div data-testid="maintenance-tabs">
      <button onClick={() => onRowClick({ id: 1 })}>Click Pending Row</button>
      <button onClick={() => onActiveRepairRowClick({ id: 2 })}>Click Active Repair Row</button>
    </div>
  ),
}));

vi.mock('@/components/features/maintenance/issue-review-panel-wrapper', () => ({
  IssueReviewPanelWrapper: ({ isOpen, onClose }: any) => (
    isOpen ? (
      <div data-testid="issue-review-panel">
        <button onClick={onClose}>Close Panel</button>
      </div>
    ) : null
  ),
}));

vi.mock('@/components/features/maintenance/log-complete-repair-dialog', () => ({
  LogCompleteRepairDialog: ({ isOpen, onConfirm }: any) => (
    isOpen ? (
      <div data-testid="log-complete-repair-dialog">
        <button onClick={() => onConfirm({ actualCost: '100' })}>Confirm Repair</button>
      </div>
    ) : null
  ),
}));

describe('MaintenanceShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getPendingMaintenanceTickets as any).mockResolvedValue({ tickets: [], total: 0 });
    (getActiveRepairTickets as any).mockResolvedValue({ tickets: [], total: 0 });
    (getRepairHistory as any).mockResolvedValue({ tickets: [], total: 0 });
  });

  it('loads data on mount', async () => {
    render(<MaintenanceShell />);

    await waitFor(() => {
      expect(getPendingMaintenanceTickets).toHaveBeenCalled();
      expect(getActiveRepairTickets).toHaveBeenCalled();
      expect(getRepairHistory).toHaveBeenCalled();
    });

    expect(screen.getByText('Maintenance & Repairs')).toBeInTheDocument();
  });

  it('opens panel when pending row is clicked', async () => {
    render(<MaintenanceShell />);

    await waitFor(() => {
      expect(screen.getByTestId('maintenance-tabs')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Click Pending Row'));
    
    expect(screen.getByTestId('issue-review-panel')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Close Panel'));

    await waitFor(() => {
      expect(screen.queryByTestId('issue-review-panel')).not.toBeInTheDocument();
    });
  });

  it('opens dialog when active repair row is clicked and handles completion', async () => {
    (completeRepairTicket as any).mockResolvedValue(true);
    
    render(<MaintenanceShell />);

    await waitFor(() => {
      expect(screen.getByTestId('maintenance-tabs')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Click Active Repair Row'));
    
    expect(screen.getByTestId('log-complete-repair-dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Confirm Repair'));

    await waitFor(() => {
      expect(completeRepairTicket).toHaveBeenCalled();
      expect(screen.queryByTestId('log-complete-repair-dialog')).not.toBeInTheDocument();
    });
  });
});
