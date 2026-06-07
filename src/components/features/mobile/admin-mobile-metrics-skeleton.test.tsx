import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AdminMobileMetricsSkeleton } from './admin-mobile-metrics-skeleton';

describe('AdminMobileMetricsSkeleton', () => {
  it('renders correctly', () => {
    const { container } = render(<AdminMobileMetricsSkeleton />);
    expect(container).toBeInTheDocument();
  });
});
