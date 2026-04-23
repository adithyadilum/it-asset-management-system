'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/shared/data-table';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import type { ColumnDef } from '@tanstack/react-table';
import type { PendingReviewTicket, IssueReviewPanelData } from '@/types/maintenance';
import { format } from 'date-fns';

interface MaintenanceTabsProps {
  pendingTickets: PendingReviewTicket[];
  isLoading: boolean;
  onRowClick: (row: PendingReviewTicket) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

/**
 * Maintenance Tabs Component
 * Displays 3 tabs: Pending Review, Active Repairs, Repair History
 * Handles data grid, search, and filtering
 * 
 * Filters pending tickets by:
 * - Asset Status: Defective or In Repair
 * - Maintenance Ticket Status: ACTIVE
 */
export function MaintenanceTabs({
  pendingTickets,
  isLoading,
  onRowClick,
  searchTerm,
  onSearchChange,
}: MaintenanceTabsProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'history'>('pending');

  // Define columns for Pending Review tab
  const pendingReviewColumns: ColumnDef<PendingReviewTicket>[] = [
    {
      accessorKey: 'asset.assetTag',
      header: 'Asset ID',
      cell: ({ row }) => <span className="font-medium">{row.original.asset.assetTag}</span>,
    },
    {
      accessorKey: 'asset.name',
      header: 'Asset Name',
      cell: ({ row }) => <span>{row.original.asset.name || row.original.model?.name || 'N/A'}</span>,
    },
    {
      accessorKey: 'reportedBy.name',
      header: 'Reported By',
      cell: ({ row }) => <span>{row.original.reportedBy?.name || 'Unknown'}</span>,
    },
    {
      accessorKey: 'reportedIssue',
      header: 'Issue',
      cell: ({ row }) => (
        <span className="truncate max-w-[250px]">{row.original.reportedIssue}</span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Date Reported',
      cell: ({ row }) => (
        <span>
          {format(new Date(row.original.createdAt), 'MM/dd/yyyy')}
        </span>
      ),
    },
  ];

  // Filter tickets based on search term
  const filteredTickets = pendingTickets.filter(
    (ticket) =>
      ticket.asset.assetTag.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.asset.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.reportedIssue.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white flex flex-col">
      <Tabs 
        value={activeTab} 
        onValueChange={(value) => setActiveTab(value as 'pending' | 'active' | 'history')} 
        className="flex flex-col h-full"
      >
        {/* Tab List */}
        <div className="border-b border-slate-200 px-6 pt-4 shrink-0">
          <TabsList className="h-auto w-fit gap-0 rounded-none bg-transparent p-0">
            <TabsTrigger
              value="pending"
              className="rounded-none border-b-2 border-b-transparent px-0 py-2 text-sm font-medium text-slate-600 data-[state=active]:border-b-blue-600 data-[state=active]:text-slate-900"
            >
              Pending Review
            </TabsTrigger>
            <TabsTrigger
              value="active"
              className="rounded-none border-b-2 border-b-transparent px-4 py-2 text-sm font-medium text-slate-600 data-[state=active]:border-b-blue-600 data-[state=active]:text-slate-900"
            >
              Active Repairs
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="rounded-none border-b-2 border-b-transparent px-4 py-2 text-sm font-medium text-slate-600 data-[state=active]:border-b-blue-600 data-[state=active]:text-slate-900"
            >
              Repair History
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Content */}
        <div className="flex flex-col gap-4 p-6 flex-1 overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-2 shrink-0">
            <Input
              placeholder="Search by Asset ID, Name, or Issue..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {/* Pending Review Tab */}
          <TabsContent value="pending" className="m-0 flex-1 overflow-hidden">
            {isLoading ? (
              <TableSkeleton
                rowCount={5}
                columnWidths={['w-[15%]', 'w-[20%]', 'w-[15%]', 'w-[30%]', 'w-[20%]']}
              />
            ) : filteredTickets.length === 0 ? (
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50">
                <span className="text-sm text-slate-500">No pending maintenance tickets found</span>
              </div>
            ) : (
              <DataTable
                columns={pendingReviewColumns}
                data={filteredTickets}
                pageSizeOptions={[10, 20, 30, 50]}
                initialPageSize={10}
                onRowClick={(row) => onRowClick(row)}
              />
            )}
          </TabsContent>

          {/* Active Repairs Tab */}
          <TabsContent value="active" className="m-0">
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50">
              <span className="text-sm text-slate-500">Active Repairs tab - Coming in US-15.4</span>
            </div>
          </TabsContent>

          {/* Repair History Tab */}
          <TabsContent value="history" className="m-0">
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50">
              <span className="text-sm text-slate-500">Repair History tab - Coming in US-15.5</span>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}