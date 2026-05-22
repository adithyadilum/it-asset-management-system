"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/date"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer,
  PieChart, Pie, LabelList,
} from "recharts"
import {
  TrendingUp, CheckCircle2, AlertCircle, Wrench, Hash,
} from "lucide-react"

// ─── Data ────────────────────────────────────────────────────────────────────

const departmentData = [
  { name: "IT",         value: 186 },
  { name: "Finance",    value: 305 },
  { name: "HR",         value: 237 },
  { name: "MKT",        value: 73  },
  { name: "Operations", value: 209 },
  { name: "R&D",        value: 214 },
]





// ─── Widget 1: Bar Chart ─────────────────────────────────────────────────────

function AssetAllocationChart() {
  return (
    <Card className="flex flex-col h-full shadow-sm border-border">
      <CardHeader className="p-3 pb-1 shrink-0">
        <CardTitle className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, "text-foreground")}>
          Asset Allocation by Department
        </CardTitle>
        <p className={cn(TYPOGRAPHY_CLASSNAMES.textXsRegular, "text-muted-foreground")}>
          January - February 2026
        </p>
      </CardHeader>

      <CardContent className="p-3 pt-1 flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={departmentData} margin={{ top: 18, right: 8, left: 0, bottom: 0 }} barSize={40}>
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#64748b" }}
              dy={4}
            />
            <YAxis hide />
            <Tooltip
              cursor={false}
              contentStyle={{
                borderRadius: "6px",
                fontSize: "11px",
                border: "1px solid hsl(var(--border))",
                padding: "4px 8px",
              }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#040d5a">
              <LabelList
                dataKey="value"
                position="top"
                style={{ fontSize: "10px", fill: "#64748b", fontWeight: 500 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>

      <div className="px-3 pb-2 shrink-0">
        <p className={cn(TYPOGRAPHY_CLASSNAMES.textXsMedium, "text-foreground flex items-center gap-1")}>
          <TrendingUp className="w-3 h-3 text-[#7cc000]" />
          Procurement up by 5.2% this month
        </p>
        <p className={cn(TYPOGRAPHY_CLASSNAMES.textXsRegular, "text-muted-foreground")}>
          Showing new asset registrations over the last 6 months.
        </p>
      </div>
    </Card>
  )
}

// ─── Widget 2: Donut Chart ───────────────────────────────────────────────────

function InventoryStatusChart({
  inventoryData,
  utilizationRate,
}: {
  inventoryData: InventoryStatusItem[]
  utilizationRate: number
}) {
  const isHealthy = utilizationRate >= 70
  const utilizationTitle = utilizationRate === 0
    ? "No active assignments"
    : isHealthy
      ? "Healthy utilization rate"
      : "Sub-optimal utilization rate"

  return (
    <Card className="flex flex-col h-full shadow-sm border-border">
      <CardHeader className="p-3 pb-1 shrink-0">
        <CardTitle className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, "text-foreground")}>
          Current Inventory Status
        </CardTitle>
        <p className={cn(TYPOGRAPHY_CLASSNAMES.textXsRegular, "text-muted-foreground")}>
          Real time distribution across all categories.
        </p>
      </CardHeader>

      <CardContent className="p-3 pt-1 flex-1 min-h-0 flex items-center">
        {inventoryData.length > 0 ? (
          <>
            {/* Donut */}
            <div className="h-full w-[55%]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Pie
                    data={inventoryData}
                    dataKey="value"
                    innerRadius="45%"
                    outerRadius="80%"
                    paddingAngle={2}
                    stroke="none"
                  >
                    {inventoryData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "6px",
                      fontSize: "11px",
                      border: "1px solid hsl(var(--border))",
                      padding: "4px 8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="w-[45%] flex flex-col gap-2 pl-2">
              {inventoryData.map((entry, i) => (
                <div key={i} className="flex items-center gap-1.5 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                  <span className={cn(TYPOGRAPHY_CLASSNAMES.textXsRegular, "text-muted-foreground leading-none truncate")}>
                    {entry.name}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex-1 flex h-full items-center justify-center text-xs text-muted-foreground border border-dashed rounded-md py-8">
            No active asset inventory found.
          </div>
        )}
      </CardContent>

      <div className="px-3 pb-2 shrink-0">
        <p className={cn(TYPOGRAPHY_CLASSNAMES.textXsMedium, "text-foreground flex items-center gap-1")}>
          <TrendingUp className={cn("w-3 h-3", isHealthy ? "text-[#7cc000]" : "text-orange-500")} />
          {utilizationTitle}
        </p>
        <p className={cn(TYPOGRAPHY_CLASSNAMES.textXsRegular, "text-muted-foreground")}>
          {utilizationRate}% of active inventory is currently assigned.
        </p>
      </div>
    </Card>
  )
}

// ─── Widget 3: Recent Activities ─────────────────────────────────────────────

import { RecentActivity, InventoryStatusItem, InventoryStatusResponse } from "@/actions/dashboard"

function RecentActivitiesList({ activities }: { activities: RecentActivity[] }) {
  const getActionStyles = (actionType: string) => {
    const type = actionType.toUpperCase()
    
    if (type.includes("CREATE") || type.includes("ADD")) {
      return { 
        icon: Hash, 
        className: "border-emerald-300 bg-emerald-50 text-emerald-700", 
        iconColor: "text-emerald-500" 
      }
    }
    if (type.includes("UPDATE") || type.includes("REPAIR") || type.includes("MAINTENANCE")) {
      return { 
        icon: Wrench, 
        className: "border-sky-300 bg-sky-50 text-sky-700", 
        iconColor: "text-sky-500" 
      }
    }
    if (type.includes("DELETE") || type.includes("REMOVE") || type.includes("LOST") || type.includes("ACCESS_DENIED")) {
      return { 
        icon: AlertCircle, 
        className: "border-rose-300 bg-rose-50 text-rose-700", 
        iconColor: "text-rose-500" 
      }
    }
    if (type.includes("DISPOSE")) {
      return { 
        icon: AlertCircle, 
        className: "border-orange-300 bg-orange-50 text-orange-700", 
        iconColor: "text-orange-500" 
      }
    }
    if (type.includes("LOGIN")) {
      return { 
        icon: CheckCircle2, 
        className: "border-violet-300 bg-violet-50 text-violet-700", 
        iconColor: "text-violet-500" 
      }
    }
    
    return { 
      icon: CheckCircle2, 
      className: "border-slate-300 bg-slate-50 text-slate-700", 
      iconColor: "text-slate-500" 
    }
  }

  return (
    <Card className="flex flex-col h-full shadow-sm border-border">
      <CardHeader className="p-3 pb-1 shrink-0">
        <CardTitle className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, "text-foreground")}>
          Recent Activities
        </CardTitle>
        <p className={cn(TYPOGRAPHY_CLASSNAMES.textXsRegular, "text-muted-foreground")}>
          latest actions, updates, and system events
        </p>
      </CardHeader>

      <CardContent className="p-3 pt-1 flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-col gap-2 h-full">
          {activities.length > 0 ? (
            activities.map((item) => {
              const styles = getActionStyles(item.actionType)
              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-start gap-2.5 px-2.5 py-2 rounded-md border text-xs font-medium",
                    styles.className
                  )}
                >
                  <styles.icon className={cn("w-3.5 h-3.5 shrink-0 mt-0.5", styles.iconColor)} />
                  <div className="flex flex-col min-w-0">
                    <span className="leading-tight line-clamp-1">{item.text}</span>
                    <span className="text-[10px] font-normal opacity-70 mt-0.5">
                      {formatDate(item.performedAt, "MMM dd, yyyy h:mm a")}
                    </span>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground border border-dashed rounded-md">
              No recent activity found.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Row: Charts Grid ─────────────────────────────────────────────────────────

export function DashboardChartsRow({ 
  activities,
  inventoryStatus,
}: { 
  activities: RecentActivity[] 
  inventoryStatus: InventoryStatusResponse
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 shrink-0 min-h-[320px]">
      <AssetAllocationChart />
      <InventoryStatusChart 
        inventoryData={inventoryStatus.inventoryData}
        utilizationRate={inventoryStatus.utilizationRate}
      />
      <RecentActivitiesList activities={activities} />
    </div>
  )
}

// ─── Row: Tabs Header (above the table) ──────────────────────────────────────

// export function DashboardTableTabsHeader() {
//   return (
//     <div className="shrink-0 flex items-center justify-between px-0.5">
//       {/* Left: Tabs */}
//       <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
//         <button className="flex items-center gap-1.5 rounded-md bg-white shadow-sm border border-border px-3 py-1 text-xs font-medium text-foreground">
//           Overdue Returns
//           <span className="ml-0.5 bg-primary text-primary-foreground text-[9px] font-semibold rounded-full px-1.5 py-0.5 leading-none">
//             8
//           </span>
//         </button>
//         <button className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-muted-foreground rounded-md">
//           Pending Approvals
//           <span className="ml-0.5 border border-muted-foreground/40 text-muted-foreground text-[9px] font-semibold rounded-full px-1.5 py-0.5 leading-none">
//             8
//           </span>
//         </button>
//       </div>

//       {/* Right: Table title */}
//       <p className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, "text-foreground")}>
//         High-Maintenance Assets (Lemons)
//       </p>
//     </div>
//   )
// }
