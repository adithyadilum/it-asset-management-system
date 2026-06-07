import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AdminMobileScannerButton } from './admin-mobile-scanner-button';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() })
}));

describe('AdminMobileScannerButton', () => {
  it('renders correctly', () => {
    render(<AdminMobileScannerButton />);
    expect(screen.getByText('Launch Scanner')).toBeInTheDocument();
  });
});
