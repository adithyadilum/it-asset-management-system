'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { AssetHistoryTimeline } from '@/components/shared/timeline';
import { getAssetAuditHistory } from '@/actions/audit-log';
import type { AuditLogRow } from '@/actions/audit-log';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export interface HistoryTabProps {
  assetId: string;
  className?: string;
}

export function HistoryTab({
  assetId,
  className = '',
}: HistoryTabProps) {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchLogs = useCallback(async (pageNum: number, isLoadMore: boolean = false) => {
    try {
      if (isLoadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      const { data, hasMore: more } = await getAssetAuditHistory(assetId, pageNum, 15);
      
      if (isLoadMore) {
        setLogs((prev) => {
          const newLogs = data.filter((d) => !prev.some((p) => p.id === d.id));
          return [...prev, ...newLogs];
        });
      } else {
        setLogs(data);
      }
      setHasMore(more);
    } catch (error) {
      console.error('Failed to fetch asset history:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [assetId]);

  useEffect(() => {
    if (assetId) {
      setPage(1);
      fetchLogs(1);
    }
  }, [assetId, fetchLogs]);

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchLogs(nextPage, true);
    }
  };

  if (isLoading) {
    return (
      <div className={cn('flex w-full items-center justify-center py-12', className)}>
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className={cn('flex w-full flex-col items-center justify-center py-12 border border-dashed border-slate-200 rounded-xl bg-slate-50', className)}>
        <p className="text-sm text-slate-500">No history records found for this asset.</p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col w-full', className)}>
      <div className="relative">
        <AssetHistoryTimeline historyLogs={logs} />
        
        {/* Fade-out effect at the bottom if there's more to load */}
        {hasMore && (
          <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        )}
      </div>

      {hasMore && (
        <div className="relative flex justify-center mt-2 pb-4 z-10">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-sm font-medium shadow-sm bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-slate-400" />
                Loading...
              </>
            ) : (
              'Load more'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}