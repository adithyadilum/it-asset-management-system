import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DepartmentAllocationChart } from './department-allocation-chart';

// ResizeObserver mock
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserver;

describe('DepartmentAllocationChart', () => {
  it('renders chart component', () => {
    const mockData = [
      { department: 'IT', allocated: 50, available: 10, inRepair: 5 }
    ];
    
    render(<DepartmentAllocationChart allocationData={mockData as any} />);
    expect(screen.getByText(/Asset Allocation by Department/i)).toBeInTheDocument();
  });
});
