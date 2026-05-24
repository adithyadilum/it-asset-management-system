import type { CSSProperties, ReactNode } from "react"
import { redirect } from "next/navigation"

import { getAuthenticatedUser } from "@/actions/auth"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { TopHeader } from "@/components/layout/top-header"
import { SidebarProvider } from "@/components/ui/sidebar"
import { OfflineBanner } from "@/components/shared/offline-banner"
import { PwaRegistration } from "@/components/shared/pwa-registration"
import { MobileRouteHandler } from "@/components/features/mobile/mobile-route-handler"
import { BottomNavigation } from "@/components/layout/bottom-navigation"

export default async function AppShellLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const user = await getAuthenticatedUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <>
      <PwaRegistration />
      <OfflineBanner />
      <MobileRouteHandler role={user.role} />
      <SidebarProvider
        defaultOpen
        style={{ "--sidebar-width": "260px" } as CSSProperties}
      >
      <div className="flex h-screen w-full items-center bg-muted p-3.5">
        <AppSidebar userRole={user.role} />

        <div className="flex h-full min-w-0 flex-1 flex-col gap-2">
          <TopHeader user={{ name: user.name, email: user.email, role: user.role }} />

          <div className="flex min-h-0 flex-1 flex-col rounded-lg bg-background">
            <div className="flex min-h-0 flex-1 flex-col rounded-md bg-background relative">
              <div className="flex min-h-0 flex-1 flex-col">{children}</div>
              <BottomNavigation />
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
    </>
  )
}