import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  it('renders a default fallback when no value is provided', () => {
    render(<StatusBadge />);
    const badge = screen.getByText('Unknown');
    expect(badge).toBeInTheDocument();
  });

  it('renders a known status from the dictionary', () => {
    render(<StatusBadge value="available" />);
    const badge = screen.getByText('Available');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-green-50');
  });

  it('handles custom variants like linkedAssets correctly', () => {
    const { rerender } = render(
      <StatusBadge variant="linkedAssets" count={3} />
    );
    expect(screen.getByText('3 Assets')).toBeInTheDocument();

    rerender(<StatusBadge variant="linkedAssets" count={1} />);
    expect(screen.getByText('1 Asset')).toBeInTheDocument();

    rerender(<StatusBadge variant="linkedAssets" count={-1} />);
    expect(screen.getByText('0 Assets')).toBeInTheDocument();
  });

  it('handles custom metadata variants correctly', () => {
    render(<StatusBadge variant="metadata" label="Custom Meta" />);
    expect(screen.getByText('Custom Meta')).toBeInTheDocument();
  });

  it('renders custom labels bypassing dictionary defaults', () => {
    render(<StatusBadge value="available" label="Ready to Use" />);
    expect(screen.getByText('Ready to Use')).toBeInTheDocument();
  });

  it('hides the icon when showIcon is false', () => {
    const { container } = render(
      <StatusBadge value="available" showIcon={false} />
    );
    const svg = container.querySelector('svg');
    expect(svg).not.toBeInTheDocument();
  });

  it('allows custom icon names and themes', () => {
    render(
      <StatusBadge value="Custom" colorTheme="red" iconName="AlertTriangle" />
    );
    const badge = screen.getByText('Custom');
    expect(badge).toBeInTheDocument();
  });
});
