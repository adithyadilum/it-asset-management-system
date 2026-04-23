// web/src/app/(app-shell)/(management)/operations/maintenance/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { MaintenanceTabs } from '@/components/features/maintenance/maintenance-tabs';
import { IssueReviewPanelWrapper } from '@/components/features/maintenance/issue-review-panel-wrapper';
import { getPendingMaintenanceTickets } from '@/actions/maintenance';
import { useSidebar } from '@/components/ui/sidebar'; // <-- Import the hook
import type { PendingReviewTicket } from '@/types/maintenance';

export default function MaintenanceAndRepairsPage() {
  const [pendingTickets, setPendingTickets] = useState<PendingReviewTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Extract setOpen from your existing sidebar context
  const { setOpen } = useSidebar(); 

  const loadPendingTickets = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await getPendingMaintenanceTickets();
      setPendingTickets(result.tickets);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPendingTickets();
  }, [loadPendingTickets]);

  const handleRowClick = (row: PendingReviewTicket) => {
    setSelectedTicketId(row.id);
    setIsPanelOpen(true);
    
    // Collapse the sidebar to make room for the slide panel
    setOpen(false); 
  };

  const handlePanelClose = () => {
    setIsPanelOpen(false);
    setTimeout(() => setSelectedTicketId(null), 300); 
    setError(null);

    // Expand the sidebar back to its normal state when the panel closes
    setOpen(true); 
  };

  return (
    <div className="flex h-full flex-col gap-4 bg-slate-50 p-4 sm:p-6">
      
      {/* Page Header */}
      <div className="space-y-1 shrink-0">
        <h1 className="text-2xl font-semibold text-slate-900">Maintenance & Repairs</h1>
        <p className="text-sm text-slate-500">
          Manage asset maintenance requests, repairs, and service history
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 shrink-0">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        
        {/* Master View (Data Grid) */}
        <div className="flex-1 h-full overflow-hidden transition-all duration-300 ease-in-out">
          <MaintenanceTabs
            pendingTickets={pendingTickets}
            isLoading={isLoading}
            onRowClick={handleRowClick}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        </div>

        {/* Detail View (Slide Panel) */}
        <div className="h-full shrink-0">
          <IssueReviewPanelWrapper
            isOpen={isPanelOpen}
            onClose={handlePanelClose}
            ticketId={selectedTicketId}
            onSuccess={loadPendingTickets}
          />
        </div>
      </div>
    </div>
  );
}