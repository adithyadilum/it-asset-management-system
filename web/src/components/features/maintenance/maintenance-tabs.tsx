'use client';

import { useState } from 'react';
import { TabsContent } from '@/components/ui/tabs';
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
        // TARGETED FIX: Force the internal content div of the Module Tabs to inherit flex behavior
        containerClassName="flex flex-col h-full overflow-hidden [&>div.mt-4]:flex-1 [&>div.mt-4]:flex [&>div.mt-4]:flex-col [&>div.mt-4]:min-h-0 [&>div.mt-4]:overflow-hidden"
      >
        {/* Content area with search and scrollable table */}
        <div className="flex flex-col gap-4 flex-1 overflow-hidden min-h-0 mt-1">
          {/* Search bar - fixed at top */}
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

          {/* Scrollable table area - takes remaining space */}
          {/* FIX: Added 'flex flex-col' so the height passes down to TabsContent */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0 rounded-md border border-slate-200 bg-white">
            
            {/* FIX: Added 'flex-1 flex-col data-[state=active]:flex' so it passes height down to DataTable */}
            <TabsContent value="pending" className="m-0 flex-1 flex-col overflow-hidden data-[state=active]:flex">
              {isLoading ? (
                <TableSkeleton rowCount={5} columnWidths={['w-[15%]', 'w-[20%]', 'w-[15%]', 'w-[30%]', 'w-[20%]']} />
              ) : filteredPendingTickets.length === 0 ? (
                <div className="flex h-full flex-1 items-center justify-center bg-slate-50">
                  <span className="text-sm text-slate-500">No pending maintenance tickets found</span>
                </div>
              ) : (
                <DataTable
                  columns={pendingReviewColumns}
                  data={filteredPendingTickets}
                  pageSizeOptions={[10, 20, 30, 50]}
                  initialPageSize={10}
                  onRowClick={(row) => onRowClick(row)}
                  // FIX: Added 'flex-1'
                  className="border-0 h-full flex-1"
                  enableRowScroll={true}
                  activeRowCondition={(row: PendingReviewTicket) => row.id === selectedTicketId}
                  enableRowSelection={false}
                />
              )}
            </TabsContent>

            <TabsContent value="active" className="m-0 flex-1 flex-col overflow-hidden data-[state=active]:flex">
              <ActiveRepairsGrid tickets={filteredActiveTickets} isLoading={isLoading} onRowClick={onActiveRepairRowClick} />
            </TabsContent>

            <TabsContent value="history" className="m-0 flex-1 flex-col overflow-hidden data-[state=active]:flex">
              <RepairHistoryGrid tickets={filteredHistoryTickets} isLoading={isLoading} />
            </TabsContent>

          </div>
        </div>
      </ModuleNavigationTabs>
    </div>
  );
}