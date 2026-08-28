'use client';

import { useEffect, useState, useCallback, useReducer } from 'react';
import { MaintenanceTabs } from '@/components/features/maintenance/maintenance-tabs';
import { IssueReviewPanelWrapper } from '@/components/features/maintenance/issue-review-panel-wrapper';
import { LogCompleteRepairDialog } from '@/components/features/maintenance/log-complete-repair-dialog';
import {
  getMaintenanceOverview,
  completeRepairTicket,
} from '@/actions/maintenance';
import { useSidebar } from '@/components/ui/sidebar';
import { toast } from 'sonner';
import type {
  PendingReviewTicket,
  ActiveRepairTicket,
  RepairHistoryTicket,
  CompleteRepairFormData,
} from '@/types/maintenance';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';

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

type MaintenanceOverview = Awaited<ReturnType<typeof getMaintenanceOverview>>;
const inFlightOverviewRequests = new Map<
  string,
  Promise<MaintenanceOverview>
>();

function requestMaintenanceOverview(
  userRole: string | undefined,
  query: string
) {
  const requestKey = `${userRole ?? 'unknown'}:${query}`;
  const existingRequest = inFlightOverviewRequests.get(requestKey);
  if (existingRequest) return existingRequest;

  const request = getMaintenanceOverview(query).finally(() => {
    if (inFlightOverviewRequests.get(requestKey) === request) {
      inFlightOverviewRequests.delete(requestKey);
    }
  });
  inFlightOverviewRequests.set(requestKey, request);
  return request;
}

function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case 'OPEN_PANEL':
      return { ...state, isPanelOpen: true, selectedTicketId: action.payload };
    case 'CLOSE_PANEL':
      return { ...state, isPanelOpen: false };
    case 'CLEAR_SELECTED_TICKET':
      return { ...state, selectedTicketId: null };
    case 'OPEN_COMPLETE_DIALOG':
      return {
        ...state,
        showCompleteDialog: true,
        activeRepairDetails: action.payload,
      };
    case 'CLOSE_COMPLETE_DIALOG':
      return { ...state, showCompleteDialog: false, activeRepairDetails: null };
    case 'SET_COMPLETING':
      return { ...state, isCompletingRepair: action.payload };
    default:
      return state;
  }
}

export function MaintenanceShell({ userRole }: { userRole?: string }) {
  const [pendingTickets, setPendingTickets] = useState<PendingReviewTicket[]>(
    []
  );
  const [activeRepairTickets, setActiveRepairTickets] = useState<
    ActiveRepairTicket[]
  >([]);
  const [repairHistoryTickets, setRepairHistoryTickets] = useState<
    RepairHistoryTicket[]
  >([]);
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

  const loadData = useCallback(
    async (query: string) => {
      try {
        setIsLoading(true);
        const result = await requestMaintenanceOverview(userRole, query);
        setPendingTickets(result.pendingTickets);
        setActiveRepairTickets(result.activeRepairTickets);
        setRepairHistoryTickets(result.repairHistoryTickets);
      } catch (err) {
        console.error(
          '[MaintenanceShell] Failed to load data:',
          err instanceof Error ? err.message : 'Unknown error'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [userRole]
  );

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
        formData.updateStatusTo,
        formData.currencyCode
      );

      toast.success('Repair logged successfully!');
      dispatch({ type: 'CLOSE_COMPLETE_DIALOG' });
      await loadData(debouncedSearch);
    } catch (err) {
      console.error(
        '[MaintenanceShell] Failed to complete repair:',
        err instanceof Error ? err.message : 'Unknown error'
      );
      const errorMessage =
        err instanceof Error ? err.message : 'An unexpected error occurred.';
      toast.error(`Failed: ${errorMessage}`);
    } finally {
      dispatch({ type: 'SET_COMPLETING', payload: false });
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] w-full bg-muted overflow-hidden">
      {/* LEFT CARD (Main Tabs) */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <main className="flex min-h-0 flex-1 flex-col rounded-xl bg-background p-6">
          <div className="mb-4 shrink-0">
            <h1
              className={`${TYPOGRAPHY_CLASSNAMES.text2xlSemiBold} text-foreground`}
            >
              Maintenance & Repairs
            </h1>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden flex flex-col">
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
              userRole={userRole}
            />
          </div>
        </main>
      </div>

      <IssueReviewPanelWrapper
        isOpen={uiState.isPanelOpen}
        onClose={handlePanelClose}
        ticketId={uiState.selectedTicketId}
        onSuccess={() => loadData(debouncedSearch)}
      />

      <LogCompleteRepairDialog
        isOpen={uiState.showCompleteDialog}
        onClose={() => dispatch({ type: 'CLOSE_COMPLETE_DIALOG' })}
        onConfirm={handleCompleteRepair}
        isLoading={uiState.isCompletingRepair}
      />
    </div>
  );
}
