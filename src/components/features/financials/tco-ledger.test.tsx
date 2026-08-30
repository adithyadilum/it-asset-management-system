import { CurrencyProvider } from '@/components/providers/currency-provider';
import { render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { TCOLedger } from './tco-ledger';
import { getTCOLedger } from '@/actions/financials';

vi.mock('@/actions/financials', () => ({
  getTCOLedger: vi.fn(),
}));

describe('TCOLedger', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  const mockSummary = {
    totalPurchase: 1500,
    totalMaintenance: 200,
    totalTCO: 1700,
    maintenanceShare: 13.3,
    maintainedCount: 1,
    assetCount: 1,
    asOf: '2026-08-28T00:00:00.000Z',
  };

  const mockData = [
    {
      id: '1',
      assetId: 'AST-002',
      category: 'Servers',
      purchaseDate: '2022-05-10T00:00:00Z',
      originalPrice: 5000,
      totalRepairCosts: 200,
      totalTCO: 5200,
      currencyCode: 'USD',
    },
  ];

  const mockTrend = [
    { month: '2022-05', purchase: 5000, maintenance: 0, total: 5000 },
    { month: '2023-01', purchase: 5000, maintenance: 200, total: 5200 },
  ];

  it('renders correctly with initial data', () => {
    render(
      <StrictMode>
        <CurrencyProvider initialCurrency="USD">
          <TCOLedger
            initialData={mockData}
            initialSummary={mockSummary}
            initialTrend={mockTrend}
          />
        </CurrencyProvider>
      </StrictMode>
    );
    expect(screen.getByText('AST-002')).toBeInTheDocument();
    expect(screen.getByText('Servers')).toBeInTheDocument();
    expect(getTCOLedger).not.toHaveBeenCalled();
  });
});
