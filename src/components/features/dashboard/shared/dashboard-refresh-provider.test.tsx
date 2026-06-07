import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DashboardRefreshProvider, useDashboardRefresh } from './dashboard-refresh-provider';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() })
}));

const TestComponent = () => {
    // @ts-ignore
  const { isRefreshing } = useDashboardRefresh();
  return <div>{isRefreshing ? 'Refreshing' : 'Idle'}</div>;
};

describe('DashboardRefreshProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('provides refresh state to children', () => {
    // @ts-ignore
    render(
      <DashboardRefreshProvider>
        <TestComponent />
      </DashboardRefreshProvider>
    );
    expect(screen.getByText('Idle')).toBeInTheDocument();
  });
});
