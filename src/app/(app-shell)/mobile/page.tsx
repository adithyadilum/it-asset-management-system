import { requirePageAuth } from "@/lib/auth/page-guard"
import { canManageAssets } from "@/lib/auth/roles"
import { Suspense } from "react"
import { AdminMobileScannerButton } from "@/components/features/mobile/admin-mobile-scanner-button"
import { AdminMobileMetrics } from "@/components/features/mobile/admin-mobile-metrics"
import { AdminMobileMetricsSkeleton } from "@/components/features/mobile/admin-mobile-metrics-skeleton"

export default async function MobilePage() {
  await requirePageAuth(canManageAssets)

  return (
    <div className="flex w-full flex-col h-full bg-background md:hidden">
      <div className="flex flex-col gap-6 p-4 pb-32 md:hidden bg-white min-h-screen font-sans">
        <AdminMobileScannerButton />
        
        <Suspense fallback={<AdminMobileMetricsSkeleton />}>
          <AdminMobileMetrics />
        </Suspense>
      </div>
    </div>
  )
}