import { CurrencyProvider } from '@/components/providers/currency-provider';
import { render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { WriteOffsLedger } from './write-offs-ledger';
import { getWriteOffsLedger } from '@/actions/financials';

vi.mock('@/actions/financials', () => ({
  getWriteOffsLedger: vi.fn(),
}));

describe('WriteOffsLedger', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  const mockSummary = {
    disposalCount: 1,
    totalWrittenOff: 500,
    totalExpectedSalvage: 200,
    totalRealisedSalvage: 150,
    salvageVariance: -50,
    byStatus: [{ status: 'Completed', count: 1, expected: 200, realised: 150 }],
    asOf: '2026-08-28T00:00:00.000Z',
  };

  const mockData = [
    {
      id: '1',
      assetId: 'AST-003',
      category: 'Monitors',
      disposalDate: new Date('2024-01-20T00:00:00Z'),
      originalPrice: 300,
      bookValue: 0,
      estimatedSalvageValue: 30,
      actualSalvageValue: 50,
      currencyCode: 'USD',
    },
  ];

  it('renders correctly with initial data', () => {
    render(
      <StrictMode>
        <CurrencyProvider initialCurrency="USD">
          <WriteOffsLedger
            initialData={mockData}
            initialSummary={mockSummary}
          />
        </CurrencyProvider>
      </StrictMode>
    );
    expect(screen.getByText('AST-003')).toBeInTheDocument();
    expect(screen.getByText('Monitors')).toBeInTheDocument();
    expect(getWriteOffsLedger).not.toHaveBeenCalled();
  });
});
