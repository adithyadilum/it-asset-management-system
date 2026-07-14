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

  it('renders employee alerts component', () => {
    const mockAlerts: PortalAlerts = {
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
    };
    render(
      <CurrencyProvider initialCurrency="USD">
        <EmployeeAlerts alerts={mockAlerts} />
      </CurrencyProvider>
    );

    expect(screen.getByText(/Action Required/i)).toBeInTheDocument();
  });
});
