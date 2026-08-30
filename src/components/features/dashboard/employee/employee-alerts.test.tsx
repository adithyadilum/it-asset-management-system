import { CurrencyProvider } from '@/components/providers/currency-provider';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { EmployeeAlerts } from './employee-alerts';
import type { PortalAlerts } from '@/lib/data/portal-repo';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe('EmployeeAlerts', () => {
  afterEach(async () => {
    // Flush microtasks to prevent React Fiber act() leaks
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.clearAllMocks();
  });

  const renderAlerts = (alerts: PortalAlerts) =>
    render(
      <CurrencyProvider initialCurrency="USD">
        <EmployeeAlerts alerts={alerts} />
      </CurrencyProvider>
    );

  it('renders return reminders', () => {
    renderAlerts({
      pendingAcceptance: [],
      returnRequested: [
        {
          assignmentId: 2,
          assetId: '2',
          assetTag: 'AST-2',
          modelName: 'Dock',
          returnRequestedAt: '2026-08-20',
        },
      ],
      upcomingReturns: [],
    });

    expect(screen.getByText(/Urgent Action Required/i)).toBeInTheDocument();
    expect(screen.getByText(/Dock/)).toBeInTheDocument();
  });

  it('leaves acceptance to the asset card rather than duplicating it here', () => {
    renderAlerts({
      pendingAcceptance: [
        {
          assignmentId: 1,
          assetId: '1',
          assetTag: 'AST-1',
          modelName: 'Laptop',
          category: 'Laptop',
          assignedDate: '2023-01-01',
          assignedByName: 'IT',
        },
      ],
      returnRequested: [],
      upcomingReturns: [],
    });

    expect(screen.queryByText(/Review & Accept/i)).not.toBeInTheDocument();
  });
});
