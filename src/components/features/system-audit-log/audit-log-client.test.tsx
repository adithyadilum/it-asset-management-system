import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AuditLogClient from './audit-log-client';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => '/system-audit-log',
  useSearchParams: () => new URLSearchParams()
}));

vi.mock('@/actions/audit-log', () => ({
  getAuditLogs: vi.fn().mockResolvedValue({
    data: [],
    meta: { total: 0, page: 1, pageSize: 16, totalPages: 1 }
  })
}));

describe('AuditLogClient', () => {
  it('renders correctly', async () => {
    render(<AuditLogClient initialResult={{ data: [], meta: { total: 0, page: 1, pageSize: 16, totalPages: 1 } } as any} />);
    expect(screen.getByText('System Audit Log')).toBeInTheDocument();
    
    // Wait for the async effect to finish to avoid the 'act' warning
    await waitFor(() => {
      expect(screen.getByText('System Audit Log')).toBeInTheDocument();
    });
  });
});
