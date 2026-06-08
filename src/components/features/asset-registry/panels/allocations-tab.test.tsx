import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { AllocationsTab } from './allocations-tab';

describe('AllocationsTab', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    const mockUsers = [{
      id: 'u1', name: 'John Doe', email: 'john@example.com', assignedDate: '2023-01-01'
    }];
    render(<AllocationsTab totalSeats={5} allocatedCount={1} allocations={mockUsers} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
