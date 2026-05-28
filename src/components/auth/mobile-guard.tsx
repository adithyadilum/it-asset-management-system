"use client"

import type { ReactNode } from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import DesktopScreenRequired from "@/components/mobile/desktop-screen-required"

type MobileGuardProps = {
  children: ReactNode
}

export default function MobileGuard({ children }: MobileGuardProps) {
  const isMobile = useIsMobile()

  // If we're on a small/mobile viewport, show the desktop-required fallback.
  if (isMobile) {
    return <DesktopScreenRequired />
  }

  // Otherwise render the wrapped children normally (desktop and larger viewports).
  return <>{children}</>
}
