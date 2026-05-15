/**
 * DashboardTablesRow
 *
 * Server component — fetches real data via server actions, then passes it
 * as props to the client shell that handles tab interactivity.
 */

import {
  getDashboardOverdueReturns,
  getDashboardHighMaintenanceAssets,
  getDashboardPendingDisposals,
  type OverdueReturnRow,
  type HighMaintenanceRow,
  type PendingDisposalRow,
} from "@/actions/dashboard"
import { DashboardTablesRowClient } from "./dashboard-tables-row-client"

export async function DashboardTablesRow() {
  const [overdueReturns, highMaintenanceAssets, pendingDisposals] = await Promise.all([
    getDashboardOverdueReturns().catch(() => [] as OverdueReturnRow[]),
    getDashboardHighMaintenanceAssets().catch(() => [] as HighMaintenanceRow[]),
    getDashboardPendingDisposals().catch(() => [] as PendingDisposalRow[]),
  ])

  return (
    <DashboardTablesRowClient
      overdueReturns={overdueReturns}
      highMaintenanceAssets={highMaintenanceAssets}
      pendingDisposals={pendingDisposals}
    />
  )
}
