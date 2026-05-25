/**
 * DashboardTablesRow
 *
 * Server component — fetches real data via server actions, then passes it
 * as props to the client shell that handles tab interactivity.
 */

import {
  type OverdueReturnRow,
  type HighMaintenanceRow,
  type PendingDisposalRow,
} from "@/actions/dashboard"
import { DashboardTablesRowClient } from "./dashboard-tables-row-client"

interface DashboardTablesRowProps {
  overdueReturns: OverdueReturnRow[];
  highMaintenanceAssets: HighMaintenanceRow[];
  pendingDisposals: PendingDisposalRow[];
  role?: string;
}

export function DashboardTablesRow({ 
  overdueReturns, 
  highMaintenanceAssets, 
  pendingDisposals,
  role
}: DashboardTablesRowProps) {
  return (
    <DashboardTablesRowClient
      overdueReturns={overdueReturns}
      highMaintenanceAssets={highMaintenanceAssets}
      pendingDisposals={pendingDisposals}
      role={role}
    />
  )
}
