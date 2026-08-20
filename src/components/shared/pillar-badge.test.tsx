import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PillarBadge } from './pillar-badge';

describe('PillarBadge', () => {
  it('renders Hardware pillar with correct styling', () => {
    const { container } = render(<PillarBadge pillar="Hardware" />);
    expect(screen.getByText('Hardware')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('bg-indigo-50');
  });

  it('renders Software pillar with correct styling', () => {
    const { container } = render(<PillarBadge pillar="Software" />);
    expect(screen.getByText('Software')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('bg-violet-50');
  });

  it('renders Office Furniture pillar with correct styling', () => {
    const { container } = render(<PillarBadge pillar="Office Furniture" />);
    expect(screen.getByText('Office Furniture')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('bg-amber-50');
  });

  it('renders Office Electronics pillar with correct styling', () => {
    const { container } = render(<PillarBadge pillar="Office Electronics" />);
    expect(screen.getByText('Office Electronics')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('bg-teal-50');
  });

  it('renders a fallback style for unknown pillars', () => {
    const { container } = render(<PillarBadge pillar="Unknown Pillar" />);
    expect(screen.getByText('Unknown Pillar')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('bg-muted');
  });

  it('applies custom className', () => {
    const { container } = render(
      <PillarBadge pillar="Software" className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
