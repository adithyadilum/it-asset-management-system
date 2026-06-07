import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TCOLedger } from './tco-ledger';

vi.mock('@/actions/financials', () => ({
  getTCOLedger: vi.fn(),
}));

describe('TCOLedger', () => {
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
