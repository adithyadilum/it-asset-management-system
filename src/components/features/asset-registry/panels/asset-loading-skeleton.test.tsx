import { render, screen } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { AssetLoadingSkeleton } from './asset-loading-skeleton';

describe('AssetLoadingSkeleton', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  it('renders skeleton loader', () => {
    render(<AssetLoadingSkeleton />);
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });
});
