import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LoadingSpinner } from './loading-spinner';

describe('LoadingSpinner', () => {
  it('renders properly with default props', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('h-6 w-6'); // Default size md
  });

  it('applies the correct size class for sm', () => {
    render(<LoadingSpinner size="sm" />);
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('h-4 w-4');
  });

  it('applies the correct size class for lg', () => {
    render(<LoadingSpinner size="lg" />);
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('h-8 w-8');
  });

  it('applies custom className', () => {
    render(<LoadingSpinner className="text-red-500" />);
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('text-red-500');
  });
});
