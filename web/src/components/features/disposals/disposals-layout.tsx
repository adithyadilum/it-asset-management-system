'use client';

import { useEffect, useCallback, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSidebar } from '@/components/ui/sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


import { PendingDisposalsGrid, type PendingDisposalRow } from './pending-disposals-grid';
import { DisposalHistoryGrid, type HistoryDisposalRow } from './disposal-history-grid';
import { DisposalReviewPanelWrapper } from '@/components/features/disposals/disposal-review-panel-wrapper';
import { DisposalAssetDetailPanel } from './disposal-asset-detail-panel';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';

interface DisposalsLayoutProps {
  pendingData: PendingDisposalRow[];
  historyData?: HistoryDisposalRow[];
  historyPageCount?: number;
  historyCurrentPage?: number;
  historyPageSize?: number;
  historySearchQuery?: string;
}

export function DisposalsLayout({ 
  pendingData, 
  historyData = [],
  historyPageCount = 1,
  historyCurrentPage = 1,
  historyPageSize = 10,
  historySearchQuery = '',
}: DisposalsLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setOpen, open } = useSidebar();

  const currentPanel = searchParams.get('panel');
  const recordId = searchParams.get('id');

  const isReviewOpen = currentPanel === 'review';
  const isRecordOpen = currentPanel === 'record';
  const numericRecordId = recordId ? Number(recordId) : null;

  const [activeTab, setActiveTab] = useState('pending');

  const selectedRow = isReviewOpen && numericRecordId
    ? pendingData.find((row) => row.id === numericRecordId) || null
    : null;

  const selectedHistoryRow = isRecordOpen && recordId
    ? historyData.find((row) => row.assetId === recordId) || null
    : null;

  const closeReviewPanel = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('panel');
    params.delete('id');

    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, searchParams, router]);

  const openReviewPanel = (row: PendingDisposalRow) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('panel', 'review');
    params.set('id', String(row.id));

    setOpen(false);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const openRecordPanel = (row: HistoryDisposalRow) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('panel', 'record');
    params.set('id', row.assetId);

    setOpen(false);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleTabChange = (val: string) => {
    if (val === activeTab) return;

    if (isReviewOpen || isRecordOpen) {
      closeReviewPanel();
      
      setTimeout(() => {
        setActiveTab(val);
      }, 450);
    } else {
      setActiveTab(val);
    }
  };

  useEffect(() => {
    
    if (open && isReviewOpen) {
      
      setOpen(false);
         
      closeReviewPanel();
      
      setTimeout(() => {
        setOpen(true);
      }, 450);
    }
  }, [open, isReviewOpen, closeReviewPanel, setOpen]);

  return (
    <div className="flex h-full w-full items-stretch gap-0 overflow-hidden bg-slate-50 p-0">
      {/* Main Workspace Shell */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-lg bg-white">
        {/* Header */}
        <div className=" px-6 py-6 pb-0">
          <h1 className={`${TYPOGRAPHY_CLASSNAMES.text2xlSemiBold} text-slate-900`}>
            Disposals
          </h1>
        </div>

        {/* Tabs Container */}
        <Tabs 
          value={activeTab} 
          className="flex flex-1 flex-col min-h-0"
          onValueChange={handleTabChange}
        >
          {/* Tab List */}
          <div className=" px-4 pt-4">
            <TabsList className="h-8 w-fit justify-start gap-2 rounded-lg bg-slate-100 p-1">
              <TabsTrigger
                value="pending"
                className={`rounded-md px-4 py-1 ${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-600 transition-colors data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm`}
              >
                Pending Disposal ({pendingData.length})
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className={`rounded-md px-4 py-1 ${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-600 transition-colors data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm`}
              >
                Disposal History
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Content - Pending */}
          <TabsContent
            value="pending"
            className="m-0 flex flex-1 flex-col min-h-0 outline-none px-6 py-4"
          >
            <PendingDisposalsGrid
              initialData={pendingData}
              onRowClick={openReviewPanel}
            />
          </TabsContent>

          {/* Tab Content - History */}
          <TabsContent value="history" className="m-0 flex flex-1 flex-col min-h-0 outline-none px-6 py-4">
            <DisposalHistoryGrid 
              initialData={historyData} 
              pageCount={historyPageCount}
              currentPage={historyCurrentPage}
              pageSize={historyPageSize}
              searchQuery={historySearchQuery}
              onRowClick={openRecordPanel}
            />
          </TabsContent>
        </Tabs>
      </div>


      <DisposalReviewPanelWrapper
        isOpen={isReviewOpen}
        onClose={closeReviewPanel}
        row={selectedRow}
      />

      <DisposalAssetDetailPanel
        isOpen={isRecordOpen}
        onClose={closeReviewPanel}
        assetId={recordId ?? ''}
        disposalDetails={selectedHistoryRow ? {
          reason: selectedHistoryRow.reason,
          flaggedBy: selectedHistoryRow.flaggedBy,
          disposedBy: selectedHistoryRow.disposedBy,
          disposalDate: selectedHistoryRow.disposalDate ? new Date(selectedHistoryRow.disposalDate).toLocaleDateString() : null,
          status: selectedHistoryRow.status,
          documentUrls: selectedHistoryRow.documentUrls
        } : undefined}
      />
    </div>
  );
}