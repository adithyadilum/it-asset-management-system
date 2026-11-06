import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DASHBOARD_AUTO_REFRESH_MS } from '@/lib/constants/dashboard';
import {
  DashboardRefreshProvider,
  useDashboardRefresh,
} from './dashboard-refresh-provider';

const mockRouter = { refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => mockRouter }));

const initialRefreshedAt = '2026-11-06T04:30:00.000Z';

function RefreshConsumer() {
  const { refresh, lastRefreshedAt } = useDashboardRefresh();
  return <button onClick={refresh}>{lastRefreshedAt.toISOString()}</button>;
}

function renderDashboard() {
  return render(
    <DashboardRefreshProvider initialRefreshedAt={initialRefreshedAt}>
      <RefreshConsumer />
    </DashboardRefreshProvider>
  );
}

describe('DashboardRefreshProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-06T04:31:00.000Z'));
    mockRouter.refresh.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('uses the server timestamp without refreshing the stream on mount', () => {
    renderDashboard();
    expect(screen.getByRole('button').textContent).toBe(initialRefreshedAt);
    act(() => vi.advanceTimersByTime(1000));
    expect(mockRouter.refresh).not.toHaveBeenCalled();
  });

  it('refreshes manually and updates the timestamp', () => {
    renderDashboard();
    fireEvent.click(screen.getByRole('button'));
    expect(mockRouter.refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button').textContent).toBe(
      '2026-11-06T04:31:00.000Z'
    );
  });

  it('refreshes at the configured interval and clears it on unmount', () => {
    const { unmount } = renderDashboard();
    act(() => vi.advanceTimersByTime(DASHBOARD_AUTO_REFRESH_MS));
    expect(mockRouter.refresh).toHaveBeenCalledTimes(1);
    unmount();
    act(() => vi.advanceTimersByTime(DASHBOARD_AUTO_REFRESH_MS));
    expect(mockRouter.refresh).toHaveBeenCalledTimes(1);
  });

  it('refreshes when returning to a visible tab and removes listeners on unmount', () => {
    const visibility = vi.spyOn(document, 'visibilityState', 'get');
    visibility.mockReturnValue('hidden');
    const { unmount } = renderDashboard();
    fireEvent(document, new Event('visibilitychange'));
    fireEvent.focus(window);
    expect(mockRouter.refresh).not.toHaveBeenCalled();

    visibility.mockReturnValue('visible');
    fireEvent(document, new Event('visibilitychange'));
    expect(mockRouter.refresh).toHaveBeenCalledTimes(1);
    unmount();
    fireEvent.focus(window);
    fireEvent(document, new Event('visibilitychange'));
    expect(mockRouter.refresh).toHaveBeenCalledTimes(1);
  });
});
