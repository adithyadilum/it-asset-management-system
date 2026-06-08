import { render } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { AdminMobileMetricsSkeleton } from './admin-mobile-metrics-skeleton';

describe('AdminMobileMetricsSkeleton', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    const { container } = render(<AdminMobileMetricsSkeleton />);
    expect(container).toBeInTheDocument();
  });
});
