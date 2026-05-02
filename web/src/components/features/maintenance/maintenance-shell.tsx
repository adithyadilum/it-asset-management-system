'use client';

import { useEffect, useState, useCallback, useReducer } from 'react';
import { MaintenanceTabs } from '@/components/features/maintenance/maintenance-tabs';
import { IssueReviewPanelWrapper } from '@/components/features/maintenance/issue-review-panel-wrapper';
import { LogCompleteRepairDialog } from '@/components/features/maintenance/log-complete-repair-dialog';
import { getPendingMaintenanceTickets, getActiveRepairTickets, getRepairHistory, completeRepairTicket } from '@/actions/maintenance';
import { useSidebar } from '@/components/ui/sidebar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { PendingReviewTicket, ActiveRepairTicket, RepairHistoryTicket, CompleteRepairFormData } from '@/types/maintenance';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';

// ... [Reducer Logic remains unchanged]
interface UIState {
  isPanelOpen: boolean;
  selectedTicketId: number | null;
  showCompleteDialog: boolean;
  activeRepairDetails: ActiveRepairTicket | null;
  isCompletingRepair: boolean;
}

type UIAction =
  | { type: 'OPEN_PANEL'; payload: number }
  | { type: 'CLOSE_PANEL' }
  | { type: 'CLEAR_SELECTED_TICKET' }
  | { type: 'OPEN_COMPLETE_DIALOG'; payload: ActiveRepairTicket }
  | { type: 'CLOSE_COMPLETE_DIALOG' }
  | { type: 'SET_COMPLETING'; payload: boolean };

const initialUIState: UIState = {
  isPanelOpen: false,
  selectedTicketId: null,
  showCompleteDialog: false,
  activeRepairDetails: null,
  isCompletingRepair: false,
};

function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case 'OPEN_PANEL':
      return { ...state, isPanelOpen: true, selectedTicketId: action.payload };
    case 'CLOSE_PANEL':
      return { ...state, isPanelOpen: false };
    case 'CLEAR_SELECTED_TICKET':
      return { ...state, selectedTicketId: null };
    case 'OPEN_COMPLETE_DIALOG':
      return { ...state, showCompleteDialog: true, activeRepairDetails: action.payload };
    case 'CLOSE_COMPLETE_DIALOG':
      return { ...state, showCompleteDialog: false, activeRepairDetails: null };
    case 'SET_COMPLETING':
      return { ...state, isCompletingRepair: action.payload };
    default:
      return state;
  }
}
// ============================================================================

export function MaintenanceShell() {
  const [pendingTickets, setPendingTickets] = useState<PendingReviewTicket[]>([]);
  const [activeRepairTickets, setActiveRepairTickets] = useState<ActiveRepairTicket[]>([]);
  const [repairHistoryTickets, setRepairHistoryTickets] = useState<RepairHistoryTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const { setOpen } = useSidebar();

  const [uiState, dispatch] = useReducer(uiReducer, initialUIState);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadData = useCallback(async (query: string) => {
    try {
      setIsLoading(true);
      const [ticketsResult, activeResult, historyResult] = await Promise.all([
        getPendingMaintenanceTickets(query),
        getActiveRepairTickets(query),
        getRepairHistory(1, 100, query)
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
        await loadData(debouncedSearch);
      }
    };
    initLoad();
    return () => {
      isMounted = false;
    };
  }, [loadData, debouncedSearch]);

  const handlePendingRowClick = (row: PendingReviewTicket) => {
    dispatch({ type: 'OPEN_PANEL', payload: row.id });
    setOpen(false);
  };

  const handlePanelClose = () => {
    dispatch({ type: 'CLOSE_PANEL' });
    setTimeout(() => dispatch({ type: 'CLEAR_SELECTED_TICKET' }), 300);
    setOpen(true);
  };

  const handleActiveRepairRowClick = (ticket: ActiveRepairTicket) => {
    dispatch({ type: 'OPEN_COMPLETE_DIALOG', payload: ticket });
  };

  const handleCompleteRepair = async (formData: CompleteRepairFormData) => {
    if (!uiState.activeRepairDetails) return;
    try {
      dispatch({ type: 'SET_COMPLETING', payload: true });
      await completeRepairTicket(
        uiState.activeRepairDetails.id,
        formData.actualCost,
        formData.resolutionNotes,
        formData.updateStatusTo
      );

      toast.success('Repair logged successfully!');
      dispatch({ type: 'CLOSE_COMPLETE_DIALOG' });
      await loadData(debouncedSearch);
    } catch (err) {
      console.error('Failed to complete repair:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
      toast.error(`Failed: ${errorMessage}`);
    } finally {
      dispatch({ type: 'SET_COMPLETING', payload: false });
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-50">
      <main className="flex min-h-0 min-w-0 flex-1 flex-col rounded-xl bg-white p-6">
        <div className="mb-4 shrink-0">
          <h1 className={`${TYPOGRAPHY_CLASSNAMES.text2xlSemiBold} text-slate-900`}>
            Maintenance & Repairs
          </h1>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <MaintenanceTabs
            pendingTickets={pendingTickets}
            activeRepairTickets={activeRepairTickets}
            repairHistoryTickets={repairHistoryTickets}
            isLoading={isLoading}
            onRowClick={handlePendingRowClick}
            onActiveRepairRowClick={handleActiveRepairRowClick}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedTicketId={uiState.selectedTicketId}
          />
        </div>
      </main>

      <div
        className={cn(
          "shrink-0 overflow-hidden rounded-xl bg-white shadow-box-shadow-shadow-lg transition-[width,margin,opacity,transform] duration-300 ease-out",
          uiState.isPanelOpen
            ? "border border-border opacity-100 translate-x-0"
            : "border-0 opacity-0 translate-x-8"
        )}
        style={{
          width: uiState.isPanelOpen ? '550px' : '0px',
          marginLeft: uiState.isPanelOpen ? '1.25rem' : '0px',
        }}
      >
        <div className="flex h-full w-full flex-col">
          <IssueReviewPanelWrapper
            isOpen={uiState.isPanelOpen}
            onClose={handlePanelClose}
            ticketId={uiState.selectedTicketId}
            onSuccess={() => loadData(debouncedSearch)}
          />
        </div>
      </div>

      <LogCompleteRepairDialog
        isOpen={uiState.showCompleteDialog}
        onClose={() => dispatch({ type: 'CLOSE_COMPLETE_DIALOG' })}
        onConfirm={handleCompleteRepair}
        isLoading={uiState.isCompletingRepair}
      />
    </div>
  );
}