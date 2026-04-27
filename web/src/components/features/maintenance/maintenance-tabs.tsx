
// web/src/components/features/maintenance/maintenance-tabs.tsx'use client';

import { useState } from 'react';
import { TabsContent } from '@/components/ui/tabs'; // We only need TabsContent now!
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { DataTable } from '@/components/shared/data-table';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { ModuleNavigationTabs } from '@/components/shared/module-navigation-tabs';
import { ActiveRepairsGrid } from './active-repairs-grid';
import { RepairHistoryGrid } from './repair-history-grid';
import type { ColumnDef } from '@tanstack/react-table';
import type { PendingReviewTicket, ActiveRepairTicket, RepairHistoryTicket } from '@/types/maintenance';
import { format } from 'date-fns';

interface MaintenanceTabsProps {
  pendingTickets: PendingReviewTicket[];
  activeRepairTickets: ActiveRepairTicket[];
  repairHistoryTickets: RepairHistoryTicket[];
  isLoading: boolean;
  onRowClick: (row: PendingReviewTicket) => void;
  onActiveRepairRowClick: (ticket: ActiveRepairTicket) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedTicketId?: number | null;
}

export function MaintenanceTabs({
  pendingTickets,
  activeRepairTickets,
  repairHistoryTickets,
  isLoading,
  onRowClick,
  onActiveRepairRowClick,
  searchTerm,
  onSearchChange,
  selectedTicketId,
}: MaintenanceTabsProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'history'>('pending');

  const pendingReviewColumns: ColumnDef<PendingReviewTicket>[] = [
    {
      accessorKey: 'asset.assetTag',
      header: 'Asset ID',
      cell: ({ row }) => <span className="font-medium text-slate-900">{row.original.asset.assetTag}</span>,
    },
    {
      accessorKey: 'asset.name',
      header: 'Asset Name',
      cell: ({ row }) => <span className="text-slate-600">{row.original.asset.name || row.original.model?.name || 'N/A'}</span>,
    },
    {
      accessorKey: 'reportedBy.name',
      header: 'Dispatched By',
      cell: ({ row }) => (
        <span className="text-slate-600">{row.original.reportedBy?.name || 'Unknown'}</span>
      ),
    },
    {
      accessorKey: 'reportedIssue',
      header: 'Issue',
      cell: ({ row }) => (
        <span className="truncate max-w-[250px] text-slate-600">{row.original.reportedIssue}</span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Date Reported',
      cell: ({ row }) => (
        <span className="text-slate-600">
          {format(new Date(row.original.createdAt), 'MM/dd/yyyy')}
        </span>
      ),
    },
  ];

  const filteredPendingTickets = pendingTickets.filter(
    (ticket) =>
      ticket.asset.assetTag.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.asset.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.reportedIssue.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredActiveTickets = activeRepairTickets.filter(
    (ticket) =>
      ticket.rmaNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.vendorName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredHistoryTickets = repairHistoryTickets.filter(
    (ticket) =>
      ticket.assetId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.vendorName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Configure the tabs for the shared component
  const tabConfig = [
    {
      id: 'pending',
      label: `Pending Review ${pendingTickets.length > 0 ? `(${pendingTickets.length})` : ''}`,
    },
    {
      id: 'active',
      label: `Active Repairs ${activeRepairTickets.length > 0 ? `(${activeRepairTickets.length})` : ''}`,
    },
    {
      id: 'history',
      label: 'Repair History',
    },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0 px-6 pt-2 pb-6">
      <ModuleNavigationTabs
        tabs={tabConfig}
        defaultTab={activeTab}
        onTabChange={(value) => setActiveTab(value as 'pending' | 'active' | 'history')}
        containerClassName="flex flex-col h-full overflow-hidden"
      >
        {/* Content area: Injecting the search bar and grids via children */}
        <div className="flex flex-col gap-4 flex-1 overflow-hidden mt-1">
          <div className="flex items-center shrink-0">
            <div className="relative w-full max-w-[400px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder={
                  activeTab === 'pending'
                    ? 'Search by Asset ID, Name, or Issue...'
                    : activeTab === 'active'
                    ? 'Search by RMA or Vendor...'
                    : 'Search by Asset ID or Vendor...'
                }
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 h-9 bg-white"
              />
            </div>
          </div>

          <TabsContent value="pending" className="m-0 flex-1 overflow-y-auto overflow-x-hidden rounded-md border border-slate-200 bg-white">
            {isLoading ? (
              <TableSkeleton rowCount={5} columnWidths={['w-[15%]', 'w-[20%]', 'w-[15%]', 'w-[30%]', 'w-[20%]']} />
            ) : filteredPendingTickets.length === 0 ? (
              <div className="flex h-32 items-center justify-center bg-slate-50">
                <span className="text-sm text-slate-500">No pending maintenance tickets found</span>
              </div>
            ) : (
              <DataTable
                columns={pendingReviewColumns}
                data={filteredPendingTickets}
                pageSizeOptions={[10, 20, 30, 50]}
                initialPageSize={10}
                onRowClick={(row) => onRowClick(row)}
                className="border-0"
                enableSelection={false}
                activeRowCondition={(row: PendingReviewTicket) => row.id === selectedTicketId}
              />
            )}
          </TabsContent>

          <TabsContent value="active" className="m-0 flex-1 overflow-y-auto overflow-x-hidden rounded-md border border-slate-200 bg-white">
            <ActiveRepairsGrid tickets={filteredActiveTickets} isLoading={isLoading} onRowClick={onActiveRepairRowClick} />
          </TabsContent>

          <TabsContent value="history" className="m-0 flex-1 overflow-y-auto overflow-x-hidden rounded-md border border-slate-200 bg-white">
            <RepairHistoryGrid tickets={filteredHistoryTickets} isLoading={isLoading} />
          </TabsContent>
        </div>
      </ModuleNavigationTabs>
    </div>
  );
}