import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { DepartmentAllocationChart } from './department-allocation-chart';

// ResizeObserver mock
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserver);

describe('DepartmentAllocationChart', () => {
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
      { department: 'IT', allocated: 50, available: 10, inRepair: 5 }
    ];
    
    render(<DepartmentAllocationChart allocationData={mockData as any} />);
    expect(screen.getByText(/Asset Allocation by Department/i)).toBeInTheDocument();
  });
});
