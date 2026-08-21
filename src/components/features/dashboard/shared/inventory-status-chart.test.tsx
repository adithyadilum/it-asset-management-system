import { CurrencyProvider } from '@/components/providers/currency-provider';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { InventoryStatusChart } from './inventory-status-chart';

// ResizeObserver mock
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserver);

describe('InventoryStatusChart', () => {
  afterAll(() => {
    vi.unstubAllGlobals();
  });

  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  it('renders chart component', () => {
    const mockData = [
      { name: 'New / Available', value: 100, color: '#123456' },
    ];

    render(
      <CurrencyProvider initialCurrency="USD">
        <InventoryStatusChart inventoryData={mockData} utilizationRate={0} />
      </CurrencyProvider>
    );
    expect(screen.getByText(/Inventory Status/i)).toBeInTheDocument();
  });
});
