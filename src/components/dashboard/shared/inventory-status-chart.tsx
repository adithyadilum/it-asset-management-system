"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography"
import { cn } from "@/lib/utils"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import Link from "next/link"
import { TrendingUp, ArrowUpRight } from "lucide-react"
import type { InventoryStatusItem } from "@/actions/dashboard/shared"

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
    badgeClass: 'bg-destructive/10 text-red-500 border-red-500/20 dark:bg-destructive/20',
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
    badgeClass: 'bg-muted0/10 text-muted-foreground border-slate-500/20 dark:bg-muted0/20',
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

interface InventoryStatusChartProps {
  inventoryData: InventoryStatusItem[]
  utilizationRate: number
}

export function InventoryStatusChart({
  inventoryData,
  utilizationRate,
}: InventoryStatusChartProps) {
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
      <CardHeader className="p-4 pb-2 shrink-0">
        <CardTitle className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, "text-foreground")}>
          <Link
            href="/assets?sort=status"
            className="group inline-flex items-center gap-1 hover:text-primary transition-colors duration-200 cursor-pointer"
          >
            Current Inventory Status
            <ArrowUpRight className="w-3.5 h-3.5 opacity-0 -translate-y-0.5 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:translate-y-0 transition-all duration-200 text-primary shrink-0" />
          </Link>
        </CardTitle>
        <p className={cn(TYPOGRAPHY_CLASSNAMES.textXsRegular, "text-muted-foreground")}>
          Real time distribution across all categories.
        </p>
      </CardHeader>

      <CardContent className="p-4 pt-1 flex-1 min-h-0 flex items-center justify-between">
        {inventoryData.length > 0 ? (
          <>
            {/* Donut Column (Left) */}
            <div className="h-full w-[55%] min-h-[210px] relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%" minHeight={1} minWidth={1}>
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }} aria-label="Current inventory status donut chart">
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
                  onFocus={() => setHoveredIndex(i)}
                  onBlur={() => setHoveredIndex(null)}
                  tabIndex={0}
                  role="button"
                  aria-label={`${entry.name}: ${entry.value} assets`}
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

      <div className="px-4 pb-4 shrink-0">
        <p className={cn(TYPOGRAPHY_CLASSNAMES.textXsMedium, "text-foreground flex items-center gap-1")}>
          <TrendingUp className={cn("w-3 h-3", isHealthy ? "text-emerald-500" : "text-orange-500")} />
          {utilizationTitle}
        </p>
        <p className={cn(TYPOGRAPHY_CLASSNAMES.textXsRegular, "text-muted-foreground")}>
          {utilizationRate}% of active inventory is currently assigned.
        </p>
      </div>
    </Card>
  )
}
