import { Card, CardContent } from "@/components/ui/card"

export function AdminMobileMetricsSkeleton() {
  return (
    <>
      {/* Quick Metrics Grid Skeleton */}
      <section className="flex flex-col gap-3 animate-pulse mt-1">
        <div className="h-5 w-32 bg-muted rounded"></div>
        <div className="grid grid-cols-2 gap-4">
          <Card className="shadow-none border border-border rounded-[16px]">
            <CardContent className="p-4 flex flex-col gap-3">
              <div className="h-6 w-6 bg-muted rounded-full"></div>
              <div className="flex flex-col gap-2">
                <div className="h-3 w-24 bg-muted rounded"></div>
                <div className="h-8 w-12 bg-muted rounded mt-1"></div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-none border border-border rounded-[16px]">
            <CardContent className="p-4 flex flex-col gap-3">
              <div className="h-6 w-6 bg-muted rounded-full"></div>
              <div className="flex flex-col gap-2">
                <div className="h-3 w-24 bg-muted rounded"></div>
                <div className="h-8 w-12 bg-muted rounded mt-1"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Recent Activities Skeleton */}
      <section className="flex flex-col gap-2 animate-pulse mt-4">
        <div className="flex flex-col mb-2 gap-2">
          <div className="h-5 w-40 bg-muted rounded"></div>
          <div className="h-4 w-64 bg-muted rounded"></div>
        </div>
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg px-4 py-3 bg-background border-border h-[46px]"></div>
          ))}
        </div>
      </section>
    </>
  )
}
