import { CurrencyProvider } from '@/components/providers/currency-provider';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ITOperatorDashboardView } from './it-operator-dashboard-view';

vi.mock('../shared/kpi-metrics-row', () => ({
  KpiMetricsRow: () => <div data-testid="kpi-metrics" />,
}));
vi.mock('../shared/data-tables-container', () => ({
  DataTablesContainer: () => <div data-testid="data-tables" />,
}));
vi.mock('@/components/shared/data-table', () => ({
  DataTable: () => <div data-testid="data-table" />,
}));

describe('ITOperatorDashboardView', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  it('renders it dashboard view', () => {
    const mockData = {
      kpiMetrics: {},
      departmentAllocation: [],
      inventoryStatus: { inventoryData: [], utilizationRate: 0 },
      recentActivities: [],
      overdueReturns: [],
      highMaintenance: [],
      systemHealth: [],
    };

    render(
      <CurrencyProvider initialCurrency="USD">
        <ITOperatorDashboardView data={mockData as any} />
      </CurrencyProvider>
    );
    expect(screen.getByTestId('kpi-metrics')).toBeInTheDocument();
  });
});
