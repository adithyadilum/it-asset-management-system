'use client';

import { useEffect, useState } from 'react';
import { MaintenanceTabs } from '@/components/features/maintenance/maintenance-tabs';
import { IssueReviewPanel } from '@/components/features/maintenance/issue-review-panel';
import { getPendingMaintenanceTickets, getTicketForIssueReview } from '@/actions/maintenance';
import type { PendingReviewTicket, IssueReviewPanelData } from '@/types/maintenance';

/**
 * Main Maintenance & Repairs Page
 * Orchestrates tabs component and slide panel
 * US-15.1 Implementation
 */
export default function MaintenanceAndRepairsPage() {
  const [pendingTickets, setPendingTickets] = useState<PendingReviewTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
    setIssuePanelData(null);
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