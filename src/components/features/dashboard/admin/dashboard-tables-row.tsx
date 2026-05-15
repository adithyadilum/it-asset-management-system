"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography"

// ─── Data ─────────────────────────────────────────────────────────────────────

const overdueRows = [
  {
    name: "User1",
    email: "Admin@tiqri.com",
    initials: "U1",
    asset: "MacBook Pro (AST-0142)",
    days: "20 Days",
  },
  {
    name: "User2",
    email: "Admin@tiqri.com",
    initials: "U2",
    asset: "MacBook Pro (AST-0142)",
    days: "14 Days",
  },
]

const pendingRows = [
  {
    name: "User3",
    email: "Admin@tiqri.com",
    initials: "U3",
    asset: "Dell XPS 15 (AST-0203)",
    days: "3 Days",
  },
  {
    name: "User4",
    email: "Admin@tiqri.com",
    initials: "U4",
    asset: "iPhone 14 Pro (AST-0311)",
    days: "7 Days",
  },
]

const lemonsRows = [
  {
    assetId: "MacBook Pro (AST-0142)",
    repairCount: "5 Repairs",
    downtime: "20 Days",
  },
  {
    assetId: "MacBook Pro (AST-0142)",
    repairCount: "5 Repairs",
    downtime: "20 Days",
  },
]

// ─── Shared sub-components ────────────────────────────────────────────────────

function DaysBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-red-500 px-2.5 py-0.5 text-[10px] font-semibold text-red-500 bg-transparent leading-none">
      {label}
    </span>
  )
}

function TableWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Table>
        {children}
      </Table>
    </div>
  )
}

const headClass = "text-xs font-medium text-muted-foreground py-3 px-4"
const cellClass = "text-xs py-3 px-4"
const rowClass = "border-b border-border/50 last:border-0"

// ─── Left: Overdue Returns table ──────────────────────────────────────────────

function OverdueTable({ rows }: { rows: typeof overdueRows }) {
  return (
    <TableWrapper>
      <TableHeader>
        <TableRow className={rowClass}>
          <TableHead className={headClass}>Employee</TableHead>
          <TableHead className={headClass}>Asset</TableHead>
          <TableHead className={headClass}>Days Overdue</TableHead>
          <TableHead className={headClass}>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => (
          <TableRow key={i} className={rowClass}>
            {/* Employee */}
            <TableCell className={cellClass}>
              <div className="flex items-center gap-2.5">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="text-[10px] font-semibold bg-muted">
                    {row.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col leading-none">
                  <span className="font-semibold text-foreground">{row.name}</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">{row.email}</span>
                </div>
              </div>
            </TableCell>
            {/* Asset */}
            <TableCell className={cn(cellClass, "text-foreground")}>{row.asset}</TableCell>
            {/* Days Overdue */}
            <TableCell className={cellClass}>
              <DaysBadge label={row.days} />
            </TableCell>
            {/* Actions */}
            <TableCell className={cellClass}>
              <Button variant="secondary" size="sm" className="h-7 text-xs px-3">
                Send Reminder
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </TableWrapper>
  )
}

// ─── Right: High-Maintenance Assets (Lemons) table ────────────────────────────

function LemonsTable() {
  return (
    <TableWrapper>
      <TableHeader>
        <TableRow className={rowClass}>
          <TableHead className={headClass}>Asset ID</TableHead>
          <TableHead className={headClass}>Repair Count</TableHead>
          <TableHead className={headClass}>Total Downtime</TableHead>
          <TableHead className={headClass}>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lemonsRows.map((row, i) => (
          <TableRow key={i} className={rowClass}>
            <TableCell className={cn(cellClass, "text-foreground")}>{row.assetId}</TableCell>
            <TableCell className={cn(cellClass, "text-muted-foreground")}>{row.repairCount}</TableCell>
            <TableCell className={cellClass}>
              <DaysBadge label={row.downtime} />
            </TableCell>
            <TableCell className={cellClass}>
              <Button variant="secondary" size="sm" className="h-7 text-xs px-3">
                Flag for Disposal
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </TableWrapper>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function DashboardTablesRow() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

      {/* ── Left: Tabbed Interface ── */}
      <Tabs defaultValue="overdue" className="w-full">
        {/* Tab triggers — h-10 matches the right-side header height */}
        <TabsList className="h-10 mb-4 gap-1 bg-muted rounded-lg p-1 w-fit">
          <TabsTrigger
            value="overdue"
            className="group flex items-center gap-1.5 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            Overdue Returns
            <span className={cn(
              "text-[9px] font-semibold rounded-full px-1.5 py-0.5 leading-none transition-colors",
              "group-data-[state=active]:bg-primary group-data-[state=active]:text-primary-foreground",
              "group-data-[state=inactive]:bg-white group-data-[state=inactive]:text-primary border border-primary/30"
            )}>
              8
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="pending"
            className="group flex items-center gap-1.5 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            Pending Approvals
            <span className={cn(
              "text-[9px] font-semibold rounded-full px-1.5 py-0.5 leading-none transition-colors",
              "group-data-[state=active]:bg-primary group-data-[state=active]:text-primary-foreground",
              "group-data-[state=inactive]:bg-white group-data-[state=inactive]:text-primary border border-primary/30"
            )}>
              8
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overdue">
          <OverdueTable rows={overdueRows} />
        </TabsContent>

        <TabsContent value="pending">
          <OverdueTable rows={pendingRows} />
        </TabsContent>
      </Tabs>

      {/* ── Right: Lemons Table ── */}
      <div className="flex flex-col w-full">
        {/* h-10 mb-4 aligns vertically with the TabsList on the left */}
        <div className="h-10 mb-4 flex items-center">
          <h3 className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, "text-foreground")}>
            High-Maintenance Assets (Lemons)
          </h3>
        </div>
        <LemonsTable />
      </div>

    </div>
  )
}
