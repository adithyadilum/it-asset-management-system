// web/src/app/(app-shell)/(management)/operations/maintenance/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { MaintenanceTabs } from '@/components/features/maintenance/maintenance-tabs';
import { IssueReviewPanelWrapper } from '@/components/features/maintenance/issue-review-panel-wrapper';
import { LogCompleteRepairDialog } from '@/components/features/maintenance/log-complete-repair-dialog';
import { getPendingMaintenanceTickets, getActiveRepairTickets, completeRepairTicket } from '@/actions/maintenance';
import { useSidebar } from '@/components/ui/sidebar';
import { toast } from 'sonner';
import type { PendingReviewTicket, ActiveRepairTicket, CompleteRepairFormData } from '@/types/maintenance';

export default function MaintenanceAndRepairsPage() {
  const [pendingTickets, setPendingTickets] = useState<PendingReviewTicket[]>([]);
  const [activeRepairTickets, setActiveRepairTickets] = useState<ActiveRepairTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Pending Review (Slide Panel) State
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  
  // Active Repairs (Modal) State
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [activeRepairDetails, setActiveRepairDetails] = useState<ActiveRepairTicket | null>(null);
  const [isCompletingRepair, setIsCompletingRepair] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const { setOpen } = useSidebar();

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [ticketsResult, activeResult] = await Promise.all([
        getPendingMaintenanceTickets(),
        getActiveRepairTickets()
      ]);
      setPendingTickets(ticketsResult.tickets);
      setActiveRepairTickets(activeResult.tickets);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ============ PENDING REVIEW HANDLERS ============
  const handlePendingRowClick = (row: PendingReviewTicket) => {
    setSelectedTicketId(row.id);
    setIsPanelOpen(true);
    setOpen(false); // Collapse sidebar
  };

  const handlePanelClose = () => {
    setIsPanelOpen(false);
    setTimeout(() => setSelectedTicketId(null), 300); 
    setOpen(true); // Restore sidebar
  };

  // ============ ACTIVE REPAIRS HANDLERS ============
  const handleActiveRepairRowClick = (ticket: ActiveRepairTicket) => {
    setActiveRepairDetails(ticket);
    setShowCompleteDialog(true);
  };

  const handleCompleteRepair = async (formData: CompleteRepairFormData) => {
    if (!activeRepairDetails) return;
    try {
      setIsCompletingRepair(true);
      await completeRepairTicket(
        activeRepairDetails.id,
        formData.actualCost,
        formData.resolutionNotes,
        formData.updateStatusTo
      );
      
      toast.success('Repair logged successfully!');
      setShowCompleteDialog(false);
      setActiveRepairDetails(null);
      await loadData(); // Refresh tables
    } catch (err) {
      console.error('Failed to complete repair:', err);
      toast.error('Failed to log completed repair.');
    } finally {
      setIsCompletingRepair(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 bg-slate-50 p-4 sm:p-6">
      <div className="space-y-1 shrink-0">
        <h1 className="text-2xl font-semibold text-slate-900">Maintenance & Repairs</h1>
        <p className="text-sm text-slate-500">
          Manage asset maintenance requests, repairs, and service history
        </p>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        <div className="flex-1 h-full overflow-hidden transition-all duration-300 ease-in-out">
          <MaintenanceTabs
            pendingTickets={pendingTickets}
            activeRepairTickets={activeRepairTickets}
            isLoading={isLoading}
            onRowClick={handlePendingRowClick}
            onActiveRepairRowClick={handleActiveRepairRowClick}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        </div>

        <div className="h-full shrink-0">
          <IssueReviewPanelWrapper
            isOpen={isPanelOpen}
            onClose={handlePanelClose}
            ticketId={selectedTicketId}
            onSuccess={loadData}
          />
        </div>
      </div>

      {/* Log Complete Repair Modal */}
      <LogCompleteRepairDialog
        isOpen={showCompleteDialog}
        onClose={() => setShowCompleteDialog(false)}
        onConfirm={handleCompleteRepair}
        isLoading={isCompletingRepair}
      />
    </div>
  );
}