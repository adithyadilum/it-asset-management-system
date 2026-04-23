//web/src/app/(app-shell)/(management)/operations/maintenance/page/tsx
'use client';

import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/shared/data-table';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { IssueReviewPanel } from '@/components/features/maintenance/issue-review-panel';
import { getPendingMaintenanceTickets, getTicketForIssueReview } from '@/actions/maintenance';
import type { ColumnDef } from '@tanstack/react-table';
import type { PendingReviewTicket } from '@/types/maintenance';
import type { IssueReviewPanelData } from '@/types/maintenance';
import { format } from 'date-fns';

/**
 * Main Maintenance & Repairs Page
 * Displays 3 tabs: Pending Review, Active Repairs, Repair History
 * US-15.1 Implementation
 */
export default function MaintenanceAndRepairsPage() {
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'history'>('pending');
  const [pendingTickets, setPendingTickets] = useState<PendingReviewTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [issuePanelData, setIssuePanelData] = useState<IssueReviewPanelData | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch pending tickets on mount
  useEffect(() => {
    async function loadPendingTickets() {
      try {
        setIsLoading(true);
        const result = await getPendingMaintenanceTickets();
        setPendingTickets(result.tickets);
      } catch (error) {
        console.error('Failed to load pending tickets:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadPendingTickets();
  }, []);

    // Handle row click to open issue review panel
  const handleRowClick = async (row: PendingReviewTicket) => {
    try {
      // REMOVE the cast entirely! Just await the function directly.
      const data = await getTicketForIssueReview(row.id);
      
      setIssuePanelData(data);
      setIsPanelOpen(true);
    } catch (error) {
      console.error('Failed to load issue review data:', error);
    }
  };

  // Close panel
  const handlePanelClose = () => {
    setIsPanelOpen(false);
    setSelectedTicketId(null);
    setIssuePanelData(null);
  };

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
    <div className="flex h-full flex-col gap-4">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">Maintenance & Repairs</h1>
        <p className="text-sm text-slate-500">
          Manage asset maintenance requests, repairs, and service history
        </p>
      </div>

      {/* Main Content with Slide Panel */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Tabs Container */}
        <div className="flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white flex flex-col">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="flex flex-col h-full">
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
                  onChange={(e) => setSearchTerm(e.target.value)}
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
                    onRowClick={(row) => handleRowClick(row)}
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

        {/* Issue Review Slide Panel */}
        <div className="w-auto">
          <IssueReviewPanel
            isOpen={isPanelOpen}
            onClose={handlePanelClose}
            data={issuePanelData}
            onResolveInternally={() => {
              // Will implement in US-15.2
              console.log('Resolve Internally');
              handlePanelClose();
            }}
            onInitiateRepair={() => {
              // Will implement in US-15.3
              console.log('Initiate Repair');
              handlePanelClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}