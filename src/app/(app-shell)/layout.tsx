import type { CSSProperties, ReactNode } from "react"
import { cookies } from "next/headers"
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

  const cookieStore = await cookies()
  const preferredCurrency = cookieStore.get('preferred_currency')?.value || 'LKR'

  return (
    <>
      <PwaRegistration />
      <OfflineBanner />
      <MobileRouteHandler role={user.role} />
      <SidebarProvider
        defaultOpen
        style={{ "--sidebar-width": "260px" } as CSSProperties}
      >
      <div className="flex h-screen w-full md:items-center bg-white md:bg-muted md:p-3.5">
        <AppSidebar userRole={user.role} />

        <div className="flex h-full w-full min-w-0 flex-1 flex-col md:gap-2">
          <TopHeader user={{ name: user.name, email: user.email, role: user.role }} preferredCurrency={preferredCurrency} />

          <div className="flex min-h-0 w-full flex-1 flex-col md:rounded-lg bg-background">
            <div className="flex min-h-0 w-full flex-1 flex-col md:rounded-md bg-background relative">
              <div className="flex min-h-0 w-full flex-1 flex-col overflow-auto">{children}</div>
              <BottomNavigation />
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
    </>
  )
}