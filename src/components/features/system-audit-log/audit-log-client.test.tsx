import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AuditLogClient from './audit-log-client';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => '/system-audit-log',
  useSearchParams: () => new URLSearchParams()
}));

describe.skip('AuditLogClient', () => {
  it('renders correctly', () => {
    render(<AuditLogClient initialResult={{ data: [], page: 1, pageSize: 10, totalPages: 0 } as any} />);
    expect(screen.getByText('System Audit Log')).toBeInTheDocument();
  });
});
