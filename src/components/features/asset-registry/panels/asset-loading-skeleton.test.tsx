import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AssetLoadingSkeleton } from './asset-loading-skeleton';

describe('AssetLoadingSkeleton', () => {
  it('renders skeleton loader', () => {
    render(<AssetLoadingSkeleton />);
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });
});
