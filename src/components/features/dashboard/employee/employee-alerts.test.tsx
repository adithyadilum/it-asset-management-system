import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EmployeeAlerts } from './employee-alerts';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() })
}));

describe('EmployeeAlerts', () => {
  it('renders employee alerts component', () => {
    const mockAlerts = {
      pendingAcceptance: [{
        assignmentId: 'a1',
        assetId: '1',
        assetTag: 'AST-1',
        assetName: 'Laptop',
        assignedDate: '2023-01-01',
        status: 'pending'
      }],
      returnRequested: [],
      upcomingReturns: []
    };
    // @ts-ignore
    render(<EmployeeAlerts alerts={mockAlerts as any} onAccept={vi.fn()} onReject={vi.fn()} onReport={vi.fn()} />);
    
    expect(screen.getByText(/Action Required/i)).toBeInTheDocument();
  });
});
