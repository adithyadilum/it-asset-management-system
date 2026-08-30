import { CurrencyProvider } from '@/components/providers/currency-provider';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { GlobalAdminDashboardView } from './global-admin-dashboard-view';

vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

// Mock charts to avoid ResizeObserver issues
vi.mock('../shared/department-allocation-chart', () => ({
  DepartmentAllocationChart: () => <div data-testid="department-chart" />,
}));
vi.mock('../shared/inventory-status-chart', () => ({
  InventoryStatusChart: () => <div data-testid="inventory-chart" />,
}));
vi.mock('../shared/kpi-metrics-row', () => ({
  KpiMetricsRow: () => <div data-testid="kpi-metrics" />,
}));
vi.mock('../shared/data-tables-container', () => ({
  DataTablesContainer: () => <div data-testid="data-tables" />,
}));
vi.mock('@/components/shared/data-table', () => ({
  DataTable: () => <div data-testid="data-table" />,
}));
vi.mock('@/actions/assignments', () => ({
  sendAssignmentReminderAction: vi.fn().mockResolvedValue({ success: true }),
}));

describe('GlobalAdminDashboardView', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  it('renders admin dashboard view with metrics and charts', () => {
    const mockData = {
      kpiMetrics: [],
      departmentAllocation: [],
      inventoryStatus: { inventoryData: [], utilizationRate: 0 },
      recentActivities: [],
      overdueReturns: [],
      pendingDisposals: [],
      highMaintenanceAssets: [],
      pendingMaintenance: [],
    };

    render(
      <CurrencyProvider initialCurrency="USD">
        <GlobalAdminDashboardView data={mockData as any} />
      </CurrencyProvider>
    );

    expect(screen.getByTestId('department-chart')).toBeInTheDocument();
    expect(screen.getByTestId('inventory-chart')).toBeInTheDocument();
  });
});
