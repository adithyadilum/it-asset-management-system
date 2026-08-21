import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { AdminMobileScannerButton } from './admin-mobile-scanner-button';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe('AdminMobileScannerButton', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<AdminMobileScannerButton />);
    expect(screen.getByText('Launch Scanner')).toBeInTheDocument();
  });
});
