"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useIsMobile } from "@/hooks/use-mobile"
import type { UserRole } from "@/types/auth"
import { canManageAssets } from "@/lib/auth/roles"

export function MobileRouteHandler({ role }: { role: UserRole }) {
  const isMobile = useIsMobile()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isMobile) return

    const isAdmin = canManageAssets(role)

    // Admin Mobile Routing
    if (isAdmin) {
      if (!pathname?.startsWith("/mobile")) {
        router.replace("/mobile")
      }
    } else {
      // Standard Employee Mobile Routing
      if (pathname?.startsWith("/mobile")) {
        router.replace("/dashboard")
      } else if (
        pathname === "/" || 
        pathname?.startsWith("/admin") || 
        pathname?.startsWith("/assets") ||
        pathname?.startsWith("/users")
      ) {
        router.replace("/dashboard")
      }
    }
  }, [isMobile, role, pathname, router])

  return null
}
