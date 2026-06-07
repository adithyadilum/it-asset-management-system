import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { InventoryStatusChart } from './inventory-status-chart';

// ResizeObserver mock
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserver;

describe('InventoryStatusChart', () => {
  it('renders chart component', () => {
    const mockData = [
      { status: 'Available', count: 100, fill: '#123456' }
    ];
    
    // @ts-ignore
    render(<InventoryStatusChart inventoryData={mockData as any} totalAssets={100} />);
    expect(screen.getByText(/Inventory Status/i)).toBeInTheDocument();
  });
});
