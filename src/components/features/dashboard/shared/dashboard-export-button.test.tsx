import { CurrencyProvider } from '@/components/providers/currency-provider';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { DashboardExportButton } from './dashboard-export-button';

describe('DashboardExportButton', () => {
  afterAll(() => {
    vi.unstubAllGlobals();
  });

  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  it('renders and triggers print', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('print', vi.fn());
    render(
      <CurrencyProvider initialCurrency="USD">
        <DashboardExportButton />
      </CurrencyProvider>
    );

    const btn = screen.getByRole('button', { name: /Export dashboard/i });
    expect(btn).toBeInTheDocument();

    await user.click(btn);

    const printItem = await screen.findByText('Print Dashboard');
    await user.click(printItem);

    expect(window.print).toHaveBeenCalled();
  });
});
