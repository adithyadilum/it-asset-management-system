import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrandHeader } from './brand-header';

describe('BrandHeader', () => {
  it('renders the expanded version by default', () => {
    render(<BrandHeader />);
    expect(screen.getByAltText('TIQRI Corporate Logo')).toBeInTheDocument();
    expect(screen.getByText('Assets')).toBeInTheDocument();
  });

  it('renders the collapsed version when collapsed prop is true', () => {
    render(<BrandHeader collapsed={true} />);
    expect(screen.getByAltText('TIQRI Assets Icon')).toBeInTheDocument();
    expect(screen.queryByText('Assets')).not.toBeInTheDocument();
  });
});
