import { CurrencyProvider } from '@/components/providers/currency-provider';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { DataTablesContainer } from './data-tables-container';

describe('DataTablesContainer', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  it('renders data tables container with sections', () => {
    render(
      <CurrencyProvider initialCurrency="USD">
        <DataTablesContainer
          leftSection={<div data-testid="left" />}
          rightSection={<div data-testid="right" />}
        />
      </CurrencyProvider>
    );

    expect(screen.getByTestId('left')).toBeInTheDocument();
    expect(screen.getByTestId('right')).toBeInTheDocument();
  });
});
