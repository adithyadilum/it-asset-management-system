'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DASHBOARD_AUTO_REFRESH_MS } from '@/lib/constants/dashboard'

interface DashboardRefreshContextValue {
  lastRefreshedAt: Date
  refresh: () => void
}

const DashboardRefreshContext = createContext<DashboardRefreshContextValue>({
  lastRefreshedAt: new Date(),
  refresh: () => {},
})

export function useDashboardRefresh() {
  return useContext(DashboardRefreshContext)
}

/**
 * Wraps dashboard content with auto-refresh (5-min interval)
 * and exposes a manual refresh callback + last-refreshed timestamp.
 */
export function DashboardRefreshProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [lastRefreshedAt, setLastRefreshedAt] = useState(() => new Date())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(() => {
    router.refresh()
    setLastRefreshedAt(new Date())
  }, [router])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      refresh()
    }, DASHBOARD_AUTO_REFRESH_MS)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [refresh])

  // Trigger refresh on mount (landing from another page) and tab focus
  useEffect(() => {
    refresh()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refresh()
      }
    }

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        refresh()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [refresh])

  return (
    <DashboardRefreshContext.Provider value={{ lastRefreshedAt, refresh }}>
      {children}
    </DashboardRefreshContext.Provider>
  )
}
