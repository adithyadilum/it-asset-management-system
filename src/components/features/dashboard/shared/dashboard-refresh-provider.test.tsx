import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DashboardRefreshProvider, useDashboardRefresh } from './dashboard-refresh-provider';

// Mock Next.js router
const mockRouter = { refresh: vi.fn() }; // Create the object ONCE

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter // Return the exact same object every time
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
    // 1. Run any pending React timeouts/intervals so they don't hang in memory
    vi.runOnlyPendingTimers();

    // 2. Restore normal time BEFORE React Testing Library tries to unmount
    vi.useRealTimers();

    // 3. Clear all mock counters
    vi.clearAllMocks();
  });

  it('provides refresh state to children', () => {
    render(
      <DashboardRefreshProvider>
        <TestComponent />
      </DashboardRefreshProvider>
    );
    expect(screen.getByText('Idle')).toBeInTheDocument();
  });
});