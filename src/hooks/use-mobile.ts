"use client"

import { useEffect, useState } from "react"

export const MOBILE_BREAKPOINT = 768

export function useEnhancedDeviceDetect() {
  const [isMobile, setIsMobile] = useState<boolean | null>(() => {
    if (typeof window === "undefined") return null
    const mqlInit = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    return mqlInit.matches
  })

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => setIsMobile(mql.matches)

    // listen for changes
    mql.addEventListener("change", onChange)

    return () => mql.removeEventListener("change", onChange)
  }, [])

  return { isMobile: !!isMobile }
}

// Backwards-compatible hook that existing code may import
export function useIsMobile() {
  const { isMobile } = useEnhancedDeviceDetect()
  return isMobile
}
