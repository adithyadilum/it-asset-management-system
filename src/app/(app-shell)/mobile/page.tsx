import { getAdminMobileMetrics } from "@/actions/mobile"
import { AdminMobileDashboard } from "@/components/features/mobile/admin-mobile-dashboard"
import { getAuthenticatedUser } from "@/actions/auth"
import { canManageAssets } from "@/lib/auth/roles"
import { redirect } from "next/navigation"

export default async function MobilePage() {
  const user = await getAuthenticatedUser()

  if (!user || !canManageAssets(user.role)) {
    redirect("/dashboard")
  }

  const metrics = await getAdminMobileMetrics()

  return (
    <div className="flex w-full flex-col h-full bg-background md:hidden">
      <AdminMobileDashboard metrics={metrics} />
    </div>
  )
}
