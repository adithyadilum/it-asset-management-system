import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WriteOffsLedger } from './write-offs-ledger';

vi.mock('@/actions/financials', () => ({
  getWriteOffsLedger: vi.fn(),
}));

describe('WriteOffsLedger', () => {
  const mockData = [
    {
      id: '1',
      assetId: 'AST-003',
      category: 'Monitors',
      disposalDate: new Date('2024-01-20T00:00:00Z'),
      originalPrice: 300,
      bookValue: 0,
      salvageValue: 50,
      currencyCode: 'USD',
    },
  ];

  it('renders correctly with initial data', () => {
    render(<WriteOffsLedger initialData={mockData} />);
    expect(screen.getByText('AST-003')).toBeInTheDocument();
    expect(screen.getByText('Monitors')).toBeInTheDocument();
  });
});
