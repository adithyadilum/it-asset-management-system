'use client';

import React from 'react';
import { AssetDetailsPanelWrapper } from '@/components/features/asset-registry/panels/asset-details-panel-wrapper';
import { StatusBadge } from '@/components/shared/status-badge';
import { FileText, ExternalLink } from 'lucide-react';
import type { DisposalHistoryDetails } from '@/types/disposals';

interface DisposalAssetDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  assetId: string;
  disposalDetails?: DisposalHistoryDetails;
}

export function DisposalAssetDetailPanel({
  isOpen,
  onClose,
  assetId,
  disposalDetails,
}: DisposalAssetDetailPanelProps) {
  const additionalTabs = React.useMemo(() => {
    if (!disposalDetails) return [];

    return [
      {
        id: 'disposal',
        label: 'Disposal',
        content: (
          <div className="flex flex-col gap-6 py-4 px-2">
            <div className="grid grid-cols-2 gap-y-4 text-sm">
              <div className="flex flex-col gap-1">
                <span className="text-slate-500 text-[12px] uppercase tracking-wider font-semibold">Disposal Status</span>
                <div className="pt-1">
                  <StatusBadge 
                    value={disposalDetails.status === 'Completed' ? 'disposed' : disposalDetails.status.toLowerCase()} 
                    label={disposalDetails.status === 'Completed' ? 'Disposed' : disposalDetails.status}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-slate-500 text-[12px] uppercase tracking-wider font-semibold">Disposal Date</span>
                <span className="text-slate-900 font-medium pt-1">{disposalDetails.disposalDate || '-'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-slate-500 text-[12px] uppercase tracking-wider font-semibold">Flagged By</span>
                <span className="text-slate-900 font-medium pt-1">{disposalDetails.flaggedBy}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-slate-500 text-[12px] uppercase tracking-wider font-semibold">Reviewed By</span>
                <span className="text-slate-900 font-medium pt-1">{disposalDetails.disposedBy || '-'}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-slate-500 text-[12px] uppercase tracking-wider font-semibold">Reason for Disposal</span>
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-100 italic text-slate-700 text-sm">
                &quot;{disposalDetails.reason}&quot;
              </div>
            </div>

            {disposalDetails.documentUrls && disposalDetails.documentUrls.length > 0 && (
              <div className="flex flex-col gap-3">
                <span className="text-slate-500 text-[12px] uppercase tracking-wider font-semibold">Disposal Documents</span>
                <div className="flex flex-col gap-2">
                  {disposalDetails.documentUrls.map((url, idx) => {
                    let filename = `Document ${idx + 1}`;
                    try {
                      const lastPart = new URL(url).pathname.split('/').pop();
                      if (lastPart) filename = decodeURIComponent(lastPart);
                    } catch {}

                    return (
                      <a 
                        key={idx} 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2 rounded-md border border-slate-100 hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileText className="h-4 w-4 text-red-500 shrink-0" />
                          <span className="text-sm text-slate-700 truncate" title={filename}>{filename}</span>
                        </div>
                        <ExternalLink className="h-3 w-3 text-slate-400 group-hover:text-blue-500 shrink-0" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )
      }
    ];
  }, [disposalDetails]);

  return (
    <AssetDetailsPanelWrapper
      isOpen={isOpen}
      onClose={onClose}
      recordId={assetId}
      hideActions={true}
      additionalTabs={additionalTabs}
    />
  );
}
