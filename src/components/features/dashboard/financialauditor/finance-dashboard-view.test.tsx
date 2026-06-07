import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FinanceDashboardView } from './finance-dashboard-view';

vi.mock('../shared/kpi-metrics-row', () => ({
  KpiMetricsRow: () => <div data-testid="kpi-metrics" />
}));
vi.mock('../shared/data-tables-container', () => ({
  DataTablesContainer: () => <div data-testid="data-tables" />
}));
vi.mock('@/components/shared/data-table', () => ({
  DataTable: () => <div data-testid="data-table" />
}));

describe('FinanceDashboardView', () => {
  it('renders finance dashboard view', () => {
    const mockData = {
      kpiMetrics: {},
      departmentAllocation: [],
      inventoryStatus: { inventoryData: [], utilizationRate: 0 },
      recentActivities: [],
      pendingAudits: [],
      highValueAssets: []
    };
    
    render(<FinanceDashboardView data={mockData as any} />);
    expect(screen.getByTestId('kpi-metrics')).toBeInTheDocument();
  });
});
