'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSidebar } from '@/components/ui/sidebar'; // Add this import
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';

import { PendingDisposalsGrid, type PendingDisposalRow } from './pending-disposals-grid';
import { DisposalReviewPanelWrapper } from '@/components/features/disposals/disposal-review-panel-wrapper';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';

interface DisposalsLayoutProps {
  pendingData: PendingDisposalRow[];
}

export function DisposalsLayout({ pendingData }: DisposalsLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setOpen } = useSidebar(); // Get sidebar control

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

    setOpen(false); // Close sidebar when panel opens
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const closeReviewPanel = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('panel');
    params.delete('id');

    // setOpen(true); 
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

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
        <Tabs defaultValue="pending" className="flex flex-1 flex-col min-h-0">
          {/* Tab List */}
          <div className=" px-6 pt-4">
            <TabsList className="h-10 w-fit justify-start gap-2 rounded-lg bg-slate-100 p-1">
              <TabsTrigger
                value="pending"
                className={`rounded-md px-4 py-1.5 ${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-600 transition-colors data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm`}
              >
                Pending Disposal
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className={`rounded-md px-4 py-1.5 ${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-slate-600 transition-colors data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm`}
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
          <TabsContent value="history" className="m-0 flex flex-1 flex-col min-h-0 outline-none">
            <Empty className="min-h-80 rounded-lg border-0 border-dashed border-slate-300 p-6">
              <EmptyHeader>
                <EmptyTitle className="text-slate-900">No disposal history</EmptyTitle>
                <EmptyDescription className="text-slate-600">
                  Disposal history will be implemented in a future iteration.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </TabsContent>
        </Tabs>
      </div>

      {/* Disposal Review Panel - Uses SlidePanel from wrapper */}
      <DisposalReviewPanelWrapper
        isOpen={isReviewOpen}
        onClose={closeReviewPanel}
        row={selectedRow}
      />
    </div>
  );
}