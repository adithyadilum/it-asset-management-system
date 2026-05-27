"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import type { ColumnDef } from "@tanstack/react-table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/shared/data-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { cn } from "@/lib/utils"
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography"
import { DisposeAssetsRequestDialog, type SelectedAssetLite } from "@/components/features/disposals/dispose-assets-request-dialog"
import type { OverdueReturnRow, HighMaintenanceRow, PendingDisposalRow } from "@/actions/dashboard"
import { tiqriToast } from "@/components/shared/sonner"
import { sendAssignmentReminderAction } from "@/actions/assignments"
import { ArrowUpRight } from "lucide-react"
import type { UserRole } from "@/types/auth"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

function getDaysPendingStatus(days: number): "critical" | "warning" | "neutral" {
  if (days > 30) return "critical"
  if (days >= 1 && days <= 14) return "warning"
  return "neutral"
}

function EmployeeCell({ name, email }: { name: string; email: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarFallback className="text-[10px] font-semibold bg-muted">
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col leading-none">
        <span className="text-xs font-semibold text-foreground">{name}</span>
        <span className="text-[10px] text-muted-foreground mt-0.5">{email}</span>
      </div>
    </div>
  )
}

// ─── Column definitions ───────────────────────────────────────────────────────

function useOverdueColumns(
  actionLabel: string,
  onSendReminder: (row: OverdueReturnRow) => void,
  sendingReminderIds: number[]
): ColumnDef<OverdueReturnRow>[] {
  return useMemo(() => [
    {
      id: "employee",
      header: "Employee",
      size: 180,
      minSize: 160,
      // meta: { noTruncate: true } allows the Avatar+text cell to render properly
      meta: { noTruncate: true },
      cell: ({ row }) => (
        <EmployeeCell name={row.original.employeeName} email={row.original.employeeEmail} />
      ),
    },
    {
      id: "asset",
      header: "Asset",
      size: 180,
      minSize: 150,
      cell: ({ row }) => (
        <span className="text-xs">
          {row.original.assetName} ({row.original.assetTag})
        </span>
      ),
    },
    {
      id: "daysOverdue",
      header: "Days Overdue",
      size: 130,
      minSize: 110,
      meta: { noTruncate: true },
      cell: ({ row }) => (
        <StatusBadge
          value="critical"
          label={`${row.original.daysOverdue} ${row.original.daysOverdue === 1 ? "Day" : "Days"}`}
        />
      ),
    },
    {
      id: "actions",
      header: "Actions",
      size: 140,
      minSize: 120,
      meta: { noTruncate: true },
      cell: ({ row }) => {
        const isSending = sendingReminderIds.includes(row.original.assignmentId)
        return (
          <Button
            variant="secondary"
            size="sm"
            className="h-7 text-xs px-3 transition-all hover:bg-primary hover:text-primary-foreground hover:shadow-sm active:scale-95"
            onClick={() => onSendReminder(row.original)}
            disabled={isSending}
          >
            {isSending ? "Sending..." : actionLabel}
          </Button>
        )
      },
    },
  ], [actionLabel, onSendReminder, sendingReminderIds])
}

function usePendingDisposalColumns(): ColumnDef<PendingDisposalRow>[] {
  const router = useRouter()

  return useMemo(() => [
    {
      id: "requestedBy",
      header: "Requested By",
      size: 180,
      minSize: 160,
      meta: { noTruncate: true },
      cell: ({ row }) => (
        <EmployeeCell name={row.original.requestedBy} email={row.original.requestedByEmail} />
      ),
    },
    {
      id: "asset",
      header: "Asset",
      size: 180,
      minSize: 150,
      cell: ({ row }) => (
        <span className="text-xs">
          {row.original.assetName} ({row.original.assetTag})
        </span>
      ),
    },
    {
      id: "daysPending",
      header: "Days Pending",
      size: 130,
      minSize: 110,
      meta: { noTruncate: true },
      cell: ({ row }) => (
        <StatusBadge
          value={getDaysPendingStatus(row.original.daysPending)}
          label={`${row.original.daysPending} ${row.original.daysPending === 1 ? "Day" : "Days"}`}
        />
      ),
    },
    {
      id: "actions",
      header: "Actions",
      size: 150,
      minSize: 130,
      meta: { noTruncate: true },
      cell: ({ row }) => (
        <Button
          variant="secondary"
          size="sm"
          className="group h-7 text-xs px-3 transition-all hover:bg-destructive hover:text-destructive-foreground hover:shadow-sm active:scale-95 inline-flex items-center gap-1"
          onClick={() =>
            router.push(
              `/operations/disposals?panel=review&id=${row.original.disposalId}`
            )
          }
        >
          Take Action
          <ArrowUpRight className="w-3.5 h-3.5 opacity-0 -translate-y-0.5 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:translate-y-0 transition-all duration-200" />
        </Button>
      ),
    },
  ], [router])
}

function useHighMaintenanceColumns(onFlag: (asset: HighMaintenanceRow) => void): ColumnDef<HighMaintenanceRow>[] {
  return useMemo(() => [
    {
      id: "asset",
      header: "Asset ID",
      size: 180,
      minSize: 150,
      cell: ({ row }) => (
        <span className="text-xs">
          {row.original.assetName} ({row.original.assetTag})
        </span>
      ),
    },
    {
      id: "repairCount",
      header: "Repair Count",
      size: 120,
      minSize: 100,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.repairCount} {row.original.repairCount === 1 ? "Repair" : "Repairs"}
        </span>
      ),
    },
    {
      id: "downtime",
      header: "Total Downtime",
      size: 130,
      minSize: 110,
      meta: { noTruncate: true },
      cell: ({ row }) => (
        <StatusBadge
          value="critical"
          label={`${row.original.totalDowntimeDays} ${row.original.totalDowntimeDays === 1 ? "Day" : "Days"}`}
        />
      ),
    },
    {
      id: "actions",
      header: "Actions",
      size: 140,
      minSize: 120,
      meta: { noTruncate: true },
      cell: ({ row }) => (
        <Button
          variant="secondary"
          size="sm"
          className="h-7 text-xs px-3 transition-all hover:bg-destructive hover:text-destructive-foreground hover:shadow-sm active:scale-95"
          onClick={() => onFlag(row.original)}
        >
          Flag for Disposal
        </Button>
      ),
    },
  ], [onFlag])
}

// ─── Main client export ───────────────────────────────────────────────────────

interface Props {
  overdueReturns: OverdueReturnRow[]
  pendingDisposals: PendingDisposalRow[]
  highMaintenanceAssets: HighMaintenanceRow[]
  userRole: UserRole
}

export function DashboardTablesRowClient({ overdueReturns, pendingDisposals, highMaintenanceAssets, userRole }: Props) {
  const showPending = userRole === 'GlobalAdmin'
  const [flaggedAsset, setFlaggedAsset] = useState<SelectedAssetLite | null>(null)
  const [isFlagDialogOpen, setIsFlagDialogOpen] = useState(false)
  const [sendingReminderIds, setSendingReminderIds] = useState<number[]>([])

  const handleFlagClick = (asset: HighMaintenanceRow) => {
    setFlaggedAsset({
      id: asset.assetId,
      assetTag: asset.assetTag,
      assetName: asset.assetName,
    })
    setIsFlagDialogOpen(true)
  }

  const handleSendReminder = async (row: OverdueReturnRow) => {
    setSendingReminderIds((prev) => [...prev, row.assignmentId])
    try {
      const result = await sendAssignmentReminderAction([row.assignmentId])
      if (result.success) {
        tiqriToast.success("Reminder sent successfully")
      } else {
        tiqriToast.error(result.error || "Failed to send reminder")
      }
    } catch {
      tiqriToast.error("Failed to send reminder due to an unexpected error")
    } finally {
      setSendingReminderIds((prev) => prev.filter((id) => id !== row.assignmentId))
    }
  }

  const overdueColumns = useOverdueColumns("Send Reminder", handleSendReminder, sendingReminderIds)
  const pendingColumns = usePendingDisposalColumns()
  const lemonsColumns = useHighMaintenanceColumns(handleFlagClick)

  const tableProps: {
    enableRowSelection: boolean
    enableRowScroll: boolean
    initialPageSize: number
    pageSizeOptions: number[]
    className: string
    hideFooter: boolean
  } = {
    enableRowSelection: false,
    enableRowScroll: true,
    // 53px header + 53px × 3 rows = 212px — shows exactly 3 rows, rest scroll
    initialPageSize: 50,
    pageSizeOptions: [50],
    className: "min-h-[212px] max-h-[350px] text-xs",
    hideFooter: true,
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

      {/* ── Left: Tabbed Interface ── */}
      <Tabs defaultValue={userRole === 'FinanceAuditor' ? "pending" : "overdue"} className="w-full">
        <TabsList className="h-10 mb-4 gap-1 bg-muted rounded-lg p-1 w-fit">
          {userRole !== 'FinanceAuditor' && (
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
              {overdueReturns.length}
            </span>
          </TabsTrigger>
          )}

          {showPending && (
            <TabsTrigger
              value="pending"
              className="group flex items-center gap-1.5 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              Pending Disposals
              <span className={cn(
                "text-[9px] font-semibold rounded-full px-1.5 py-0.5 leading-none transition-colors",
                "group-data-[state=active]:bg-primary group-data-[state=active]:text-primary-foreground",
                "group-data-[state=inactive]:bg-white group-data-[state=inactive]:text-primary border border-primary/30"
              )}>
                {pendingDisposals.length}
              </span>
            </TabsTrigger>
          )}
        </TabsList>

        {userRole !== 'FinanceAuditor' && (
        <TabsContent value="overdue">
          <DataTable
            {...tableProps}
            columns={overdueColumns}
            data={overdueReturns}
            emptyState={{
              title: "No overdue returns",
              description: "All assets have been returned on time.",
            }}
          />
        </TabsContent>
        )}

        {showPending && (
          <TabsContent value="pending">
            <DataTable
              {...tableProps}
              columns={pendingColumns}
              data={pendingDisposals}
              emptyState={{
                title: "No pending disposals",
                description: "There are no disposal requests awaiting review.",
              }}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* ── Right: High-Maintenance Assets ── */}
      {userRole !== 'FinanceAuditor' && (
      <div className="flex flex-col w-full">
        <div className="h-10 mb-4 flex items-center">
          <h3 className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, "text-foreground")}>
            High-Maintenance Assets
          </h3>
        </div>
        <DataTable
          {...tableProps}
          columns={lemonsColumns}
          data={highMaintenanceAssets}
          emptyState={{
            title: "No high-maintenance assets",
            description: "No assets have 3 or more repair tickets.",
          }}
        />
      </div>
      )}

      <DisposeAssetsRequestDialog
        open={isFlagDialogOpen}
        onOpenChange={setIsFlagDialogOpen}
        selectedAssets={flaggedAsset ? [flaggedAsset] : []}
        onSubmitted={(result) => {
          setIsFlagDialogOpen(false)
          setFlaggedAsset(null)
          if (result.inserted > 0) {
            tiqriToast.success("Asset Flagged: The asset has been successfully flagged for disposal and is awaiting admin approval.")
          } else if (result.skipped > 0) {
            tiqriToast.info("Disposal Request: This asset is already pending disposal or retired.")
          }
        }}
      />
    </div>
  )
}
