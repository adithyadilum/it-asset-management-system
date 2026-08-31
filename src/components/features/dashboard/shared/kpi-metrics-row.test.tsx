import { CurrencyProvider } from '@/components/providers/currency-provider';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { KpiMetricsRow } from './kpi-metrics-row';

describe('KpiMetricsRow', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  it('renders metrics row', () => {
    const mockMetrics = new Proxy(
      {},
      {
        get: (target, prop) => {
          if (
            prop === 'totalActiveAssetsChange' ||
            prop === 'totalAssetValueTrend'
          )
            return 5;
          if (prop === 'totalAssetValue') return 50000;
          return 1200;
        },
      }
    );

    render(
      <CurrencyProvider initialCurrency="USD">
        <KpiMetricsRow metrics={mockMetrics as any} />
      </CurrencyProvider>
    );
    expect(screen.getByText('Total Assets')).toBeInTheDocument();
    expect(screen.getByText('1,200')).toBeInTheDocument();
  });
});

describe('KpiMetricsRow layout', () => {
  afterEach(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  /** Exactly what `getITOperatorDashboardData` passes through. */
  const IT_OPERATOR_METRICS = {
    totalActiveAssets: 153,
    totalActiveAssetsChange: 4,
    fleetHealthScore: 84,
    fleetHealthLabel: 'Good',
    inactiveSoftwareSeats: 70,
    warrantyExpiries30Days: 6,
    softwareRenewals30Days: 2,
    impactedSoftwareEmployees: 3,
  };

  const GLOBAL_ADMIN_METRICS = {
    ...IT_OPERATOR_METRICS,
    totalAssetValue: 90_000_000,
    totalAssetValueTrend: 2,
    netBookValue: 69_000_000,
    cumulativeRepairSpend: 250_000,
    repairSpendTrend: -3,
    inactiveSoftwareCostLeak: 45_000,
  };

  function renderRow(metrics: object, isAuditor = false) {
    const { container } = render(
      <CurrencyProvider initialCurrency="LKR">
        <KpiMetricsRow metrics={metrics as never} isAuditor={isAuditor} />
      </CurrencyProvider>
    );
    return [...container.querySelectorAll('div.grid')];
  }

  it('puts an IT Operator’s four cards in one full-width row', () => {
    // The regression: both rows were hardcoded to lg:grid-cols-4, so two
    // cards each left the right-hand half of the dashboard empty.
    const grids = renderRow(IT_OPERATOR_METRICS);
    expect(grids).toHaveLength(1);
    expect(grids[0].className).toContain('lg:grid-cols-4');
  });

  it('renders every IT Operator card inside that single row', () => {
    renderRow(IT_OPERATOR_METRICS);
    for (const title of [
      'Total Assets',
      'Fleet Health',
      'Warranty Expiry (30d)',
      'Software Renewals (30d)',
    ]) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
  });

  it('keeps two rows of four for a role that sees every card', () => {
    const grids = renderRow(GLOBAL_ADMIN_METRICS);
    expect(grids).toHaveLength(2);
    expect(grids[0].className).toContain('lg:grid-cols-4');
    expect(grids[1].className).toContain('lg:grid-cols-4');
  });

  it('sizes the auditor’s second row to the two cards it holds', () => {
    const grids = renderRow(GLOBAL_ADMIN_METRICS, true);
    expect(grids).toHaveLength(2);
    expect(grids[1].className).toContain('lg:grid-cols-2');
  });
});
