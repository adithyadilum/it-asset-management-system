'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PendingDisposalsGrid, type PendingDisposalRow } from './pending-disposals-grid';
import { DisposalReviewPanelWrapper } from './disposal-review-panel-wrapper';

interface DisposalsLayoutProps {
  pendingData: PendingDisposalRow[];
}

export function DisposalsLayout({ pendingData }: DisposalsLayoutProps) {
  // Store the full row data when clicked
  const [selectedRow, setSelectedRow] = useState<PendingDisposalRow | null>(null);

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full">
      <Tabs defaultValue="pending" className="flex flex-col flex-1 min-h-0">
        <TabsList className="mb-6 h-10 w-fit justify-start bg-slate-100/50 p-1 rounded-lg">
          <TabsTrigger value="pending" className="rounded-md px-4 py-1.5 text-sm font-medium text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">
            Pending Disposal
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-md px-4 py-1.5 text-sm font-medium text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">
            Disposal History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="flex-1 flex flex-col min-h-0 m-0 outline-none">
          {/* Pass the row click handler down */}
          <PendingDisposalsGrid 
            initialData={pendingData} 
            onRowClick={(row) => setSelectedRow(row)} 
          />
        </TabsContent>

        <TabsContent value="history" className="flex-1 min-h-0 m-0 outline-none">
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
            Disposal history will be implemented in a future iteration.
          </div>
        </TabsContent>
      </Tabs>

      {/* The wrapper sits at the root level so it can trigger your global SlidePanel 
        We pass the actual selected row down so it shows real data! 
      */}
      <DisposalReviewPanelWrapper 
        isOpen={!!selectedRow} 
        onClose={() => setSelectedRow(null)} 
        row={selectedRow} 
      />
    </div>
  );
}