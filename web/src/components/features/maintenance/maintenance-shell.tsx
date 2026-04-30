'use client';

import { useEffect, useState, useCallback } from 'react';
import { MaintenanceTabs } from '@/components/features/maintenance/maintenance-tabs';
import { IssueReviewPanelWrapper } from '@/components/features/maintenance/issue-review-panel-wrapper';
import { LogCompleteRepairDialog } from '@/components/features/maintenance/log-complete-repair-dialog';
import { getPendingMaintenanceTickets, getActiveRepairTickets, getRepairHistory, completeRepairTicket } from '@/actions/maintenance';
import { useSidebar } from '@/components/ui/sidebar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { PendingReviewTicket, ActiveRepairTicket, RepairHistoryTicket, CompleteRepairFormData } from '@/types/maintenance';

export function MaintenanceShell() {
  const [pendingTickets, setPendingTickets] = useState<PendingReviewTicket[]>([]);
  const [activeRepairTickets, setActiveRepairTickets] = useState<ActiveRepairTicket[]>([]);
  const [repairHistoryTickets, setRepairHistoryTickets] = useState<RepairHistoryTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Pending Review (Side Card) State
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
      const [ticketsResult, activeResult, historyResult] = await Promise.all([
        getPendingMaintenanceTickets(),
        getActiveRepairTickets(),
        getRepairHistory(1, 100, '')
      ]);
      setPendingTickets(ticketsResult.tickets);
      setActiveRepairTickets(activeResult.tickets);
      setRepairHistoryTickets(historyResult.tickets);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    const initLoad = async () => {
      if (isMounted) {
        await loadData();
      }
    };
    
    initLoad();
    
    return () => {
      isMounted = false;
    };
  }, [loadData]);

  const handlePendingRowClick = (row: PendingReviewTicket) => {
    setSelectedTicketId(row.id);
    setIsPanelOpen(true);
    setOpen(false); 
  };

  const handlePanelClose = () => {
    setIsPanelOpen(false);
    setTimeout(() => setSelectedTicketId(null), 300); 
    setOpen(true); 
  };

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
      await loadData();
    } catch (err) {
      console.error('Failed to complete repair:', err);
      // Extract the specific error message from the server action
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
      toast.error(`Failed: ${errorMessage}`);
    } finally {
      setIsCompletingRepair(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] w-full bg-slate-50 p-5 overflow-hidden">
      
      {/* LEFT CARD */}
      <div className="flex flex-1 flex-col bg-white rounded-xl shadow-[0px_1px_3px_rgba(0,0,0,0.1)] border border-slate-200 overflow-hidden min-w-0 transition-all duration-300">
        <div className="px-6 pt-6 pb-2 shrink-0">
          <h1 className="text-2xl font-semibold text-slate-900">Maintenance & Repairs</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage asset maintenance requests, repairs, and service history
          </p>
        </div>

        <MaintenanceTabs
          pendingTickets={pendingTickets}
          activeRepairTickets={activeRepairTickets}
          repairHistoryTickets={repairHistoryTickets}
          isLoading={isLoading}
          onRowClick={handlePendingRowClick}
          onActiveRepairRowClick={handleActiveRepairRowClick}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedTicketId={selectedTicketId}
        />
      </div>

      {/* RIGHT CARD */}
      <div 
        className={cn(
          "shrink-0 bg-white rounded-xl shadow-[0px_1px_3px_rgba(0,0,0,0.1)] overflow-hidden transition-all duration-300 ease-in-out transform",
          isPanelOpen 
            ? "w-[550px] xl:w-[600px] ml-5 border border-slate-200 opacity-100 translate-x-0" 
            : "w-0 ml-0 border-0 opacity-0 translate-x-8" 
        )}
      >
        <div className="w-[550px] xl:w-[600px] h-full flex flex-col">
          <IssueReviewPanelWrapper
            isOpen={isPanelOpen}
            onClose={handlePanelClose}
            ticketId={selectedTicketId}
            onSuccess={loadData}
          />
        </div>
      </div>

      <LogCompleteRepairDialog
        isOpen={showCompleteDialog}
        onClose={() => setShowCompleteDialog(false)}
        onConfirm={handleCompleteRepair}
        isLoading={isCompletingRepair}
      />
    </div>
  );
}