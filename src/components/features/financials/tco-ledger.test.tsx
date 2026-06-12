import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { TCOLedger } from './tco-ledger';

vi.mock('@/actions/financials', () => ({
  getTCOLedger: vi.fn(),
}));

describe('TCOLedger', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

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

  it('renders correctly with initial data', () => {
    render(<TCOLedger initialData={mockData} />);
    expect(screen.getByText('AST-002')).toBeInTheDocument();
    expect(screen.getByText('Servers')).toBeInTheDocument();
  });
});
