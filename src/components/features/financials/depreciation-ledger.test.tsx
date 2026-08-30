import { CurrencyProvider } from '@/components/providers/currency-provider';
import { render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { DepreciationLedger } from './depreciation-ledger';
import { getDepreciationLedger } from '@/actions/financials';

vi.mock('@/actions/financials', () => ({
  getDepreciationLedger: vi.fn(),
}));

describe('DepreciationLedger', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  const mockSummary = {
    bookValueSeries: [
      { month: '2026-08', bookValue: 1000 },
      { month: '2026-09', bookValue: 950 },
    ],
    totalCost: 1500,
    totalBookValue: 1000,
    accumulatedDepreciation: 500,
    fullyDepreciated: 0,
    assetCount: 1,
    asOf: '2026-08-28T00:00:00.000Z',
  };

  const mockData = [
    {
      id: '1',
      assetId: 'AST-001',
      category: 'Laptops',
      purchaseDate: '2023-01-15T00:00:00Z',
      originalPrice: 1500,
      expectedLifespan: '3 years',
      lifeMonths: 36,
      monthsElapsed: 30,
      currentBookValue: 1000,
      currencyCode: 'USD',
    },
  ];

  it('renders correctly with initial data', () => {
    render(
      <StrictMode>
        <CurrencyProvider initialCurrency="USD">
          <DepreciationLedger
            initialData={mockData}
            initialSummary={mockSummary}
          />
        </CurrencyProvider>
      </StrictMode>
    );
    expect(screen.getByText('AST-001')).toBeInTheDocument();
    expect(screen.getByText('Laptops')).toBeInTheDocument();
    expect(getDepreciationLedger).not.toHaveBeenCalled();
  });
});
