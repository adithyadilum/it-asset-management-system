import { render, screen } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { FilterRow, SOURCE_OPTIONS } from './standard-reports-page';

describe('StandardReportsPage Utilities', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  it('exports SOURCE_OPTIONS', () => {
    expect(SOURCE_OPTIONS).toBeDefined();
    expect(Array.isArray(SOURCE_OPTIONS)).toBe(true);
  });

  it('renders FilterRow correctly', () => {
    render(
      <FilterRow label="Test Label">
        <div data-testid="child-content">Child Content</div>
      </FilterRow>
    );

    expect(screen.getByText('Test Label')).toBeInTheDocument();
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });
});
