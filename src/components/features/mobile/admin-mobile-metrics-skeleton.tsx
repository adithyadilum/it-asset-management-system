import { Card, CardContent } from "@/components/ui/card"

export function AdminMobileMetricsSkeleton() {
  return (
    <>
      {/* Quick Metrics Grid Skeleton */}
      <section className="flex flex-col gap-3 animate-pulse mt-1">
        <div className="h-5 w-32 bg-slate-200 rounded"></div>
        <div className="grid grid-cols-2 gap-4">
          <Card className="shadow-none border border-slate-200 rounded-[16px]">
            <CardContent className="p-4 flex flex-col gap-3">
              <div className="h-6 w-6 bg-slate-200 rounded-full"></div>
              <div className="flex flex-col gap-2">
                <div className="h-3 w-24 bg-slate-200 rounded"></div>
                <div className="h-8 w-12 bg-slate-200 rounded mt-1"></div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-none border border-slate-200 rounded-[16px]">
            <CardContent className="p-4 flex flex-col gap-3">
              <div className="h-6 w-6 bg-slate-200 rounded-full"></div>
              <div className="flex flex-col gap-2">
                <div className="h-3 w-24 bg-slate-200 rounded"></div>
                <div className="h-8 w-12 bg-slate-200 rounded mt-1"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Recent Activities Skeleton */}
      <section className="flex flex-col gap-2 animate-pulse mt-4">
        <div className="flex flex-col mb-2 gap-2">
          <div className="h-5 w-40 bg-slate-200 rounded"></div>
          <div className="h-4 w-64 bg-slate-200 rounded"></div>
        </div>
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg px-4 py-3 bg-white border-slate-200 h-[46px]"></div>
          ))}
        </div>
      </section>
    </>
  )
}
