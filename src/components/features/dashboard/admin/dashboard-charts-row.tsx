"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography"
import { cn } from "@/lib/utils"
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

const inventoryData = [
  { name: "New",       value: 400, color: "#2563eb" },
  { name: "Assigned",  value: 300, color: "#84cc16" },
  { name: "In Repair", value: 150, color: "#9333ea" },
  { name: "Disposed",  value: 200, color: "#e11d48" },
  { name: "Lost",      value: 100, color: "#f97316" },
]

const activities = [
  {
    text: "Laptop AST-1023 assigned to John Doe",
    icon: CheckCircle2,
    borderColor: "border-slate-200",
    iconColor: "text-slate-500",
    textColor: "text-foreground",
  },
  {
    text: "New Asset Created: AST-2026-0456 (MacBook Pro 14)",
    icon: Hash,
    borderColor: "border-blue-200",
    iconColor: "text-blue-500",
    textColor: "text-foreground",
  },
  {
    text: "Server AST-0008 marked as Lost",
    icon: AlertCircle,
    borderColor: "border-orange-200",
    iconColor: "text-orange-500",
    textColor: "text-orange-700",
  },
  {
    text: "Projector AST-0912 marked as In Repair",
    icon: Wrench,
    borderColor: "border-purple-200",
    iconColor: "text-purple-500",
    textColor: "text-foreground",
  },
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

function InventoryStatusChart() {
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
            <div key={i} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
              <span className={cn(TYPOGRAPHY_CLASSNAMES.textXsRegular, "text-muted-foreground leading-none")}>
                {entry.name}
              </span>
            </div>
          ))}
        </div>
      </CardContent>

      <div className="px-3 pb-2 shrink-0">
        <p className={cn(TYPOGRAPHY_CLASSNAMES.textXsMedium, "text-foreground flex items-center gap-1")}>
          <TrendingUp className="w-3 h-3 text-[#7cc000]" />
          Healthy utilization rate
        </p>
        <p className={cn(TYPOGRAPHY_CLASSNAMES.textXsRegular, "text-muted-foreground")}>
          89% of inventory is currently active and assigned.
        </p>
      </div>
    </Card>
  )
}

// ─── Widget 3: Recent Activities ─────────────────────────────────────────────

function RecentActivitiesList() {
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
          {activities.map((item, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-2 px-2.5 py-2 rounded-md border bg-card text-xs font-medium",
                item.borderColor,
                item.textColor
              )}
            >
              <item.icon className={cn("w-3.5 h-3.5 shrink-0", item.iconColor)} />
              <span className="leading-tight">{item.text}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Row: Charts Grid ─────────────────────────────────────────────────────────

export function DashboardChartsRow() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 shrink-0 min-h-[320px]">
      <AssetAllocationChart />
      <InventoryStatusChart />
      <RecentActivitiesList />
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
