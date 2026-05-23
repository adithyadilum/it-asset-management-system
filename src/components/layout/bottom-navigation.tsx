"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Package, Bell } from "lucide-react"

import { cn } from "@/lib/utils"

export function BottomNavigation() {
  const pathname = usePathname()

  const tabs = [
    { name: "Home", href: "/mobile", icon: Home },
    { name: "My Assets", href: "/mobile/my-assets", icon: Package },
    { name: "Notifications", href: "/mobile/notifications", icon: Bell },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden">
      <nav className="flex h-16 items-center justify-around px-4">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname?.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 w-full h-full text-muted-foreground transition-colors",
                isActive && "text-primary font-medium"
              )}
            >
              <tab.icon className={cn("h-6 w-6", isActive && "fill-primary/20")} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px]">{tab.name}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
