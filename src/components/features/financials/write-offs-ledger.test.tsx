import { CurrencyProvider } from '@/components/providers/currency-provider';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { WriteOffsLedger } from './write-offs-ledger';

vi.mock('@/actions/financials', () => ({
  getWriteOffsLedger: vi.fn(),
}));

describe('WriteOffsLedger', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

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
      <CurrencyProvider initialCurrency="USD">
        <WriteOffsLedger initialData={mockData} />
      </CurrencyProvider>
    );
    expect(screen.getByText('AST-003')).toBeInTheDocument();
    expect(screen.getByText('Monitors')).toBeInTheDocument();
  });
});
