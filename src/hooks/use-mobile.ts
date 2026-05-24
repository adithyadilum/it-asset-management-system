import * as React from "react"

export const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const subscribe = React.useCallback((callback: () => void) => {
    // Dynamically evaluate window.innerWidth
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    mql.addEventListener("change", callback)
    return () => mql.removeEventListener("change", callback)
  }, [])

  const getSnapshot = () => {
    return window.innerWidth < MOBILE_BREAKPOINT
  }

  const getServerSnapshot = () => {
    return false
  }

  const isMobile = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )

  return !!isMobile
}
