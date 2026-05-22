"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
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

// ─── Widget 1: Bar Chart ─────────────────────────────────────────────────────

interface AssetAllocationChartProps {
  allocationData: DepartmentAllocationItem[]
}

function AssetAllocationChart({ allocationData }: AssetAllocationChartProps) {
  return (
    <Card className="flex flex-col h-full shadow-sm border-border">
      <CardHeader className="p-3 pb-1 shrink-0">
        <CardTitle className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, "text-foreground")}>
          Asset Allocation by Department
        </CardTitle>
        <p className={cn(TYPOGRAPHY_CLASSNAMES.textXsRegular, "text-muted-foreground")}>
          Real-time distribution across active custodians
        </p>
      </CardHeader>

      <CardContent className="p-3 pt-1 flex-1 min-h-0 flex items-center justify-center">
        {allocationData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={allocationData} margin={{ top: 18, right: 8, left: 0, bottom: 0 }} barSize={40}>
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
              <Bar name="Assets" dataKey="value" radius={[4, 4, 0, 0]} fill="#040d5a">
                <LabelList
                  dataKey="value"
                  position="top"
                  style={{ fontSize: "10px", fill: "#64748b", fontWeight: 500 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex-1 flex h-full items-center justify-center text-xs text-muted-foreground border border-dashed rounded-md py-8">
            No assigned assets found.
          </div>
        )}
      </CardContent>

      <div className="px-3 pb-2 shrink-0">
        <p className={cn(TYPOGRAPHY_CLASSNAMES.textXsMedium, "text-foreground flex items-center gap-1")}>
          <TrendingUp className="w-3 h-3 text-[#7cc000]" />
          Dynamic allocation details by custodian
        </p>
        <p className={cn(TYPOGRAPHY_CLASSNAMES.textXsRegular, "text-muted-foreground")}>
          Showing active asset assignments across organizational units.
        </p>
      </div>
    </Card>
  )
}

// ─── Widget 2: Donut Chart ───────────────────────────────────────────────────

const STATUS_METRICS_META: Record<string, {
  metricLabel: string;
  insight: string;
  badgeClass: string;
  type: 'active' | 'inactive';
}> = {
  'Assigned': {
    metricLabel: 'Active Utilization',
    insight: 'Assets currently in active use by employees. Target: >75% for optimal device deployment.',
    badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 dark:bg-emerald-500/20',
    type: 'active'
  },
  'New / Available': {
    metricLabel: 'Standby Buffer',
    insight: 'Unassigned stock ready for immediate onboarding or hot-swaps. Recommended buffer: 5-10%.',
    badgeClass: 'bg-blue-500/10 text-blue-500 border-blue-500/20 dark:bg-blue-500/20',
    type: 'active'
  },
  'In Repair': {
    metricLabel: 'Maintenance Overhead',
    insight: 'Temporarily out of service for servicing. Goal: Keep turnaround under 5 business days.',
    badgeClass: 'bg-purple-500/10 text-purple-500 border-purple-500/20 dark:bg-purple-500/20',
    type: 'active'
  },
  'Defective': {
    metricLabel: 'Impaired Stock',
    insight: 'Requires technician diagnostics to repair or move to decommissioning queue.',
    badgeClass: 'bg-red-500/10 text-red-500 border-red-500/20 dark:bg-red-500/20',
    type: 'active'
  },
  'Lost': {
    metricLabel: 'Shrinkage Risk',
    insight: 'Unaccounted assets. High lost rates indicate a need for stricter physical audit logging.',
    badgeClass: 'bg-orange-500/10 text-orange-500 border-orange-500/20 dark:bg-orange-500/20',
    type: 'active'
  },
  'Retired': {
    metricLabel: 'End of Life',
    insight: 'Asset reached end of its logical lifetime. Safe to store or prepare for physical disposal.',
    badgeClass: 'bg-slate-500/10 text-slate-500 border-slate-500/20 dark:bg-slate-500/20',
    type: 'inactive'
  },
  'Pending Disposal': {
    metricLabel: 'Decommissioning Queue',
    insight: 'Awaiting final financial/compliance write-off and environmental disposal sign-off.',
    badgeClass: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20 dark:bg-zinc-500/20',
    type: 'active'
  },
  'Disposed': {
    metricLabel: 'Decommissioned',
    insight: 'Permanently removed from active books. Eco-friendly recycled or sold. Records kept for audit.',
    badgeClass: 'bg-rose-500/10 text-rose-500 border-rose-500/20 dark:bg-rose-500/20',
    type: 'inactive'
  }
}

function InventoryStatusChart({
  inventoryData,
  utilizationRate,
}: {
  inventoryData: InventoryStatusItem[]
  utilizationRate: number
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  
  const isHealthy = utilizationRate >= 70
  const utilizationTitle = utilizationRate === 0
    ? "No active assignments"
    : isHealthy
      ? "Healthy utilization rate"
      : "Sub-optimal utilization rate"

  // Calculate fleet totals for percentage breakdown
  const totalAll = inventoryData.reduce((sum, item) => sum + item.value, 0)


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
            {/* Donut Column (Left) */}
            <div className="h-full w-[55%] min-h-[200px] relative flex items-center justify-center">
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
                      <Cell 
                        key={i} 
                        fill={entry.color} 
                        opacity={hoveredIndex === null || hoveredIndex === i ? 1 : 0.45}
                        style={{ 
                          transition: 'opacity 200ms cubic-bezier(0.4, 0, 0.2, 1)', 
                        }}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Absolute Overlay Details Card on top of Pie Chart */}
              {hoveredIndex !== null && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 p-2 animate-in fade-in duration-200">
                  <div className="bg-popover/98 backdrop-blur-md border border-border shadow-2xl rounded-xl p-3 w-[190px] flex flex-col gap-1.5 text-popover-foreground">
                    {/* Header */}
                    <div className="flex items-center gap-1.5 pb-1 border-b border-border/50">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: inventoryData[hoveredIndex].color }} />
                      <span className="font-bold text-[10px] text-foreground tracking-tight truncate">{inventoryData[hoveredIndex].name}</span>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-1 text-[8.5px] leading-tight">
                      <div className="flex flex-col bg-muted/40 p-1 rounded-md border border-border/30">
                        <span className="text-[7.5px] text-muted-foreground">Quantity</span>
                        <span className="text-[10px] font-bold text-foreground mt-0.5">
                          {inventoryData[hoveredIndex].value} <span className="text-[7.5px] font-normal text-muted-foreground">unit{inventoryData[hoveredIndex].value !== 1 ? 's' : ''}</span>
                        </span>
                      </div>
                      <div className="flex flex-col bg-muted/40 p-1 rounded-md border border-border/30">
                        <span className="text-[7.5px] text-muted-foreground">Inventory Share</span>
                        <span className="text-[10px] font-bold text-foreground mt-0.5">
                          {((inventoryData[hoveredIndex].value / totalAll) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* Insight Text */}
                    <div className="bg-muted/50 p-1.5 rounded-lg border border-border/30 text-[8.5px] leading-relaxed text-muted-foreground/90">
                      <p>{STATUS_METRICS_META[inventoryData[hoveredIndex].name]?.insight}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Legend (Right) */}
            <div className="w-[45%] flex flex-col gap-2 pl-3 border-l border-border/30">
              {inventoryData.map((entry, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "flex items-center gap-1.5 min-w-0 py-0.5 cursor-pointer hover:bg-muted/30 px-1 rounded-sm transition-colors",
                    hoveredIndex === i ? "bg-muted/40 font-medium text-foreground" : ""
                  )}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
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

import { RecentActivity, InventoryStatusItem, InventoryStatusResponse, DepartmentAllocationItem } from "@/actions/dashboard"

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

      <CardContent className="p-3 pt-1 flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-2 pr-1">
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
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground border border-dashed rounded-md py-8">
                No recent activity found.
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

// ─── Row: Charts Grid ─────────────────────────────────────────────────────────

export function DashboardChartsRow({ 
  activities,
  inventoryStatus,
  departmentAllocation,
}: { 
  activities: RecentActivity[] 
  inventoryStatus: InventoryStatusResponse
  departmentAllocation: DepartmentAllocationItem[]
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 shrink-0 min-h-[320px]">
      <AssetAllocationChart allocationData={departmentAllocation} />
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
