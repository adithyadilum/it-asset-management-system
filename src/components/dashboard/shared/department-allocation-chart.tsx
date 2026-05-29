"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography"
import { cn } from "@/lib/utils"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from "recharts"
import { TrendingUp } from "lucide-react"
import type { DepartmentAllocationItem } from "@/actions/dashboard/shared"

interface DepartmentAllocationChartProps {
  allocationData: DepartmentAllocationItem[]
}

export function DepartmentAllocationChart({ allocationData }: DepartmentAllocationChartProps) {
  return (
    <Card className="flex flex-col h-full shadow-sm border-border">
      <CardHeader className="p-4 pb-2 shrink-0">
        <CardTitle className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, "text-foreground")}>
          Asset Allocation by Department
        </CardTitle>
        <p className={cn(TYPOGRAPHY_CLASSNAMES.textXsRegular, "text-muted-foreground")}>
          Real-time distribution across active custodians
        </p>
      </CardHeader>

      <CardContent className="p-4 pt-1 flex-1 min-h-0 flex items-center justify-center">
        {allocationData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%" minHeight={1} minWidth={1}>
            <BarChart data={allocationData} margin={{ top: 18, right: 8, left: 0, bottom: 0 }} barSize={40} aria-label="Asset allocation by department bar chart">
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                dy={4}
              />
              <YAxis hide />
              <Tooltip
                cursor={false}
                contentStyle={{
                  borderRadius: "6px",
                  fontSize: "11px",
                  border: "1px solid var(--color-border)",
                  padding: "4px 8px",
                  backgroundColor: "var(--color-popover)",
                  color: "var(--color-popover-foreground)",
                }}
              />
              <Bar name="Assets" dataKey="value" radius={[4, 4, 0, 0]} fill="var(--color-primary)">
                <LabelList
                  dataKey="value"
                  position="top"
                  style={{ fontSize: "10px", fill: "var(--color-muted-foreground)", fontWeight: 500 }}
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

      <div className="px-4 pb-4 shrink-0">
        <p className={cn(TYPOGRAPHY_CLASSNAMES.textXsMedium, "text-foreground flex items-center gap-1")}>
          <TrendingUp className="w-3 h-3 text-emerald-500" />
          Dynamic allocation details by custodian
        </p>
        <p className={cn(TYPOGRAPHY_CLASSNAMES.textXsRegular, "text-muted-foreground")}>
          Showing active asset assignments across organizational units.
        </p>
      </div>
    </Card>
  )
}
