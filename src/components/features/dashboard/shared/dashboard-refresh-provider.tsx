'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { DASHBOARD_AUTO_REFRESH_MS } from '@/lib/constants/dashboard';

interface DashboardRefreshContextValue {
  lastRefreshedAt: Date;
  refresh: () => void;
}

const DashboardRefreshContext = createContext<DashboardRefreshContextValue>({
  lastRefreshedAt: new Date(0),
  refresh: () => {},
});

export function useDashboardRefresh() {
  return useContext(DashboardRefreshContext);
}

/**
 * Wraps dashboard content with auto-refresh (5-min interval)
 * and exposes a manual refresh callback + last-refreshed timestamp.
 */
export function DashboardRefreshProvider({
  children,
  initialRefreshedAt,
}: {
  children: React.ReactNode;
  initialRefreshedAt: string;
}) {
  const router = useRouter();
  const [lastRefreshedAt, setLastRefreshedAt] = useState(
    () => new Date(initialRefreshedAt)
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(() => {
    router.refresh();
    setLastRefreshedAt(new Date());
  }, [router]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      refresh();
    }, DASHBOARD_AUTO_REFRESH_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh]);

  // The incoming server response already contains fresh data. Refreshing on
  // mount can replace that response while its Suspense boundaries hydrate.
  // Refresh only when the user returns to an existing dashboard.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refresh]);

  return (
    <DashboardRefreshContext.Provider value={{ lastRefreshedAt, refresh }}>
      {children}
    </DashboardRefreshContext.Provider>
  );
}
