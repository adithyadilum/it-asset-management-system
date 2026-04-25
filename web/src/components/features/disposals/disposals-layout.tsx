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
    <div className="flex h-full w-full flex-row gap-2 overflow-hidden">
      
      {/* Left Side: Main disposal list */}
      <div className="flex flex-1 flex-col min-h-0 min-w-0 rounded-xl border border-border bg-background p-6 shadow-sm transition-all duration-300">

        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-foreground">
            Disposals
          </h1>
        </div>

        <Tabs defaultValue="pending" className="flex flex-1 flex-col min-h-0">
          <TabsList className="mb-6 h-10 w-fit justify-start rounded-lg bg-muted p-1">
            <TabsTrigger
              value="pending"
              className="rounded-md px-4 py-1.5 text-sm font-medium text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              Pending Disposal
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="rounded-md px-4 py-1.5 text-sm font-medium text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
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
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border bg-muted/50">
              <span className="text-sm text-muted-foreground">
                Disposal history will be implemented in a future iteration.
              </span>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Right Side: Review panel */}
      {isReviewOpen && numericRecordId && (
        <div className="flex w-120 shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-background shadow-sm animate-in slide-in-from-right-8 duration-300">
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