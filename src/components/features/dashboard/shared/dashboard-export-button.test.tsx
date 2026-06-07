import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { DashboardExportButton } from './dashboard-export-button';

describe('DashboardExportButton', () => {
  it('renders and triggers print', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('print', vi.fn());
    render(<DashboardExportButton />);
    
    const btn = screen.getByRole('button', { name: /Export dashboard/i });
    expect(btn).toBeInTheDocument();
    
    await user.click(btn);
    
    const printItem = await screen.findByText('Print Dashboard');
    await user.click(printItem);
    
    expect(window.print).toHaveBeenCalled();
  });
});
