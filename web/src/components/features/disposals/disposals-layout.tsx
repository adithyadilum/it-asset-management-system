'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PendingDisposalsGrid, type PendingDisposalRow } from './pending-disposals-grid';
import { DisposalReviewPanelWrapper } from '@/components/features/disposals/disposal-review-panel-wrapper';

interface DisposalsLayoutProps {
  pendingData: PendingDisposalRow[];
}

export function DisposalsLayout({ pendingData }: DisposalsLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentPanel = searchParams.get('panel');
  const recordId = searchParams.get('id');

  const isReviewOpen = currentPanel === 'review';
  const numericRecordId = recordId ? Number(recordId) : null;

  const selectedRow = numericRecordId 
    ? pendingData.find((row) => row.id === numericRecordId) || null 
    : null;

  const openReviewPanel = (row: PendingDisposalRow) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('panel', 'review');
    params.set('id', String(row.id));
    
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    // 1. Added gap-6 to separate the two cards
    <div className="flex h-full w-full flex-row gap-6 overflow-hidden">
      
      {/* 2. Left Side: Styled as a distinct white card with padding and rounded corners */}
      <div className="flex flex-1 flex-col min-h-0 min-w-0 rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300">

        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-slate-900">Disposals</h1>
        </div>

        <Tabs defaultValue="pending" className="flex flex-1 flex-col min-h-0">
          <TabsList className="mb-6 h-10 w-fit justify-start rounded-lg bg-slate-100/80 p-1">
            <TabsTrigger
              value="pending"
              className="rounded-md px-4 py-1.5 text-sm font-medium text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
            >
              Pending Disposal
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="rounded-md px-4 py-1.5 text-sm font-medium text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
            >
              Disposal History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="m-0 flex flex-1 flex-col min-h-0 outline-none">
            <PendingDisposalsGrid
              initialData={pendingData}
              onRowClick={openReviewPanel}
            />
          </TabsContent>

          <TabsContent value="history" className="m-0 flex-1 min-h-0 outline-none">
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
              Disposal history will be implemented in a future iteration.
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* 3. Right Side: Styled as a separate white card (overflow-hidden keeps corners rounded) */}
      {isReviewOpen && (
        <div className="flex w-[480px] shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm animate-in slide-in-from-right-8 duration-300">
          <DisposalReviewPanelWrapper
            isOpen={isReviewOpen}
            onCloseUrl={pathname}
            row={selectedRow}
          />
        </div>
      )}
    </div>
  );
}