'use client';

import { useEffect, useState } from 'react';
import { MaintenanceTabs } from '@/components/features/maintenance/maintenance-tabs';
import { IssueReviewPanel } from '@/components/features/maintenance/issue-review-panel';
import { getPendingMaintenanceTickets, getTicketForIssueReview, resolveIssueInternally } from '@/actions/maintenance';
import type { PendingReviewTicket, IssueReviewPanelData } from '@/types/maintenance';

/**
 * Main Maintenance & Repairs Page
 * Orchestrates tabs component and slide panel
 * US-15.1 & US-15.2 Implementation
 * 
 * Filters:
 * - Asset Status: "Defective" or "In Repair"
 * - Maintenance Ticket Status: "ACTIVE"
 */
export default function MaintenanceAndRepairsPage() {
  const [pendingTickets, setPendingTickets] = useState<PendingReviewTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [issuePanelData, setIssuePanelData] = useState<IssueReviewPanelData | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isResolvingInternally, setIsResolvingInternally] = useState(false);
  const [error, setError] = useState<string | null>(null);

    // Fetch pending tickets on mount
  useEffect(() => {
    async function loadPendingTickets() {
      try {
        setIsLoading(true);
        setError(null);
        console.log('Loading pending tickets...');
        const result = await getPendingMaintenanceTickets();
        console.log('Pending tickets result:', result);
        setPendingTickets(result.tickets);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load pending tickets';
        console.error('Failed to load pending tickets:', err);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    }

    loadPendingTickets();
  }, []);

  // Handle row click to open issue review panel
  const handleRowClick = async (row: PendingReviewTicket) => {
    try {
      setError(null);
      const data = await getTicketForIssueReview(row.id);
      setIssuePanelData(data);
      setIsPanelOpen(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load issue review data';
      console.error('Failed to load issue review data:', err);
      setError(errorMessage);
    }
  };

  // Close panel
  const handlePanelClose = () => {
    setIsPanelOpen(false);
    setIssuePanelData(null);
    setError(null);
  };

  // Handle resolve internally action
  const handleResolveInternally = async (resolutionNote: string) => {
    if (!issuePanelData?.ticket) {
      throw new Error('No ticket selected');
    }

    try {
      setIsResolvingInternally(true);
      setError(null);
      
      await resolveIssueInternally(issuePanelData.ticket.id, resolutionNote);
      
      // Refresh tickets list
      const result = await getPendingMaintenanceTickets();
      setPendingTickets(result.tickets);
      
      // Close panel
      handlePanelClose();
      
      // Success - could add a toast here
      console.log('Issue resolved successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resolve issue';
      console.error('Failed to resolve issue:', err);
      setError(errorMessage);
      throw err; // Re-throw to be caught by dialog
    } finally {
      setIsResolvingInternally(false);
    }
  };

  // Handle initiate repair action
  const handleInitiateRepair = async () => {
    // Will implement in US-15.3
    console.log('Initiate Repair - Coming in US-15.3');
    handlePanelClose();
  };

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">Maintenance & Repairs</h1>
        <p className="text-sm text-slate-500">
          Manage asset maintenance requests, repairs, and service history
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* Main Content with Slide Panel */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Maintenance Tabs Component */}
        <MaintenanceTabs
          pendingTickets={pendingTickets}
          isLoading={isLoading}
          onRowClick={handleRowClick}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />

        {/* Issue Review Slide Panel */}
        <div className="w-auto">
          <IssueReviewPanel
            isOpen={isPanelOpen}
            onClose={handlePanelClose}
            data={issuePanelData}
            onResolveInternally={handleResolveInternally}
            onInitiateRepair={handleInitiateRepair}
            isResolvingInternally={isResolvingInternally}
          />
        </div>
      </div>
    </div>
  );
}