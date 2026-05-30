import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

function KpiCardSkeleton() {
  return (
    <Card className="flex flex-col shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 space-y-0">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-14 rounded" />
      </CardHeader>
      <CardContent className="p-4 pt-1 flex flex-col gap-2">
        <Skeleton className="h-8 w-28" />
        <div className="mt-1 space-y-1.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </CardContent>
    </Card>
  )
}

function ChartCardSkeleton() {
  return (
    <Card className="flex flex-col shadow-sm min-h-70">
      <CardHeader className="p-4 pb-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-56 mt-1" />
      </CardHeader>
      <CardContent className="p-4 pt-1 flex-1 flex items-center justify-center">
        <Skeleton className="h-full w-full rounded-md" />
      </CardContent>
    </Card>
  )
}

function TableSectionSkeleton({ isTabs = true }: { isTabs?: boolean }) {
  return (
    <div className="flex flex-col w-full">
      {isTabs ? (
        <div className="h-10 mb-4 gap-1 bg-muted rounded-lg p-1 w-fit flex items-center">
          <Skeleton className="h-8 w-32 rounded-md bg-background" />
          <Skeleton className="h-8 w-32 rounded-md" />
        </div>
      ) : (
        <div className="h-10 mb-4 flex items-center">
          <Skeleton className="h-5 w-48" />
        </div>
      )}
      <div className="border rounded-md flex flex-col overflow-hidden h-53 bg-background">
        <Skeleton className="h-10 w-full rounded-none border-b" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="flex-1 w-full rounded-none border-b last:border-b-0" />
        ))}
      </div>
    </div>
  )
}

export default function DashboardLoading() {
  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col rounded-2xl overflow-hidden">
      {/* Header skeleton */}
      <div className="shrink-0 px-6 pt-5 pb-3 bg-background">
        <div className="flex items-center justify-between pb-2">
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-32 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="flex-1 min-h-0 overflow-auto px-6 py-1 pb-5">
        <div className="flex flex-col gap-6">
          {/* Hero KPIs — 4 cards */}
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <KpiCardSkeleton key={`hero-${i}`} />
            ))}
          </div>

          {/* Secondary KPIs — 4 cards */}
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <KpiCardSkeleton key={`sec-${i}`} />
            ))}
          </div>

          {/* Charts — 3 columns */}
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <ChartCardSkeleton key={`chart-${i}`} />
            ))}
          </div>

          {/* Tables — 2 columns */}
          <div className="grid gap-6 grid-cols-1 xl:grid-cols-2">
            <TableSectionSkeleton isTabs={true} />
            <TableSectionSkeleton isTabs={false} />
          </div>
        </div>
      </div>
    </main>
  )
}
