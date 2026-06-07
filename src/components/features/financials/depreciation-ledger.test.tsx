import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DepreciationLedger } from './depreciation-ledger';

vi.mock('@/actions/financials', () => ({
  getDepreciationLedger: vi.fn(),
}));

describe('DepreciationLedger', () => {
  const mockData = [
    {
      id: '1',
      assetId: 'AST-001',
      category: 'Laptops',
      purchaseDate: '2023-01-15T00:00:00Z',
      originalPrice: 1500,
      expectedLifespan: '3 years',
      currentBookValue: 1000,
      currencyCode: 'USD',
    },
  ];

  it('renders correctly with initial data', () => {
    render(<DepreciationLedger initialData={mockData} />);
    expect(screen.getByText('AST-001')).toBeInTheDocument();
    expect(screen.getByText('Laptops')).toBeInTheDocument();
  });
});
