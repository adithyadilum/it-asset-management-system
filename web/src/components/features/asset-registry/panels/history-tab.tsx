'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AssetHistoryTimeline } from '@/components/shared/timeline';
import { getAssetAuditHistory } from '@/actions/audit-log';
import type { AuditLogRow } from '@/actions/audit-log';
import { Button } from '@/components/ui/button';

const PAGE_SIZE = 15;

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
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async (pageNum: number, isLoadMore: boolean = false) => {
    try {
      setError(null);

      // Keep the spinner scoped to the initial load or the pagination request.
      if (isLoadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      const { data, hasMore: more } = await getAssetAuditHistory(assetId, pageNum, PAGE_SIZE);

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
      setError(error instanceof Error ? error.message : 'Failed to load asset history.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [assetId]);

  useEffect(() => {
    if (assetId) {
      const timeoutId = window.setTimeout(() => {
        void fetchLogs(1);
      }, 0);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }
  }, [assetId, fetchLogs]);

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchLogs(nextPage, true);
    }
  };

  const handleRetry = () => {
    setPage(1);
    setLogs([]);
    setHasMore(false);
    fetchLogs(1);
  };

  if (isLoading) {
    return (
      <div className={cn('flex w-full items-center justify-center py-12', className)}>
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error && logs.length === 0) {
    return (
      <div className={cn('flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-rose-200 bg-rose-50 px-6 py-12', className)}>
        <AlertCircle className="h-6 w-6 text-rose-500" />
        <div className="text-center">
          <p className="text-sm font-medium text-rose-900">Unable to load asset history</p>
          <p className="mt-1 text-sm text-rose-700">{error}</p>
        </div>
        <Button type="button" variant="outline" size="sm" className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50" onClick={handleRetry}>
          Retry
        </Button>
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
      {error ? (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button type="button" variant="outline" size="sm" className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50" onClick={handleRetry}>
            Retry
          </Button>
        </div>
      ) : null}

      <div className="relative">
        <AssetHistoryTimeline historyLogs={logs} showEntityLabel={false} />

        {/* Fade-out effect at the bottom if there's more to load */}
        {hasMore && (
          <div className="absolute bottom-0 left-0 h-32 w-full bg-linear-to-t from-white to-transparent pointer-events-none" />
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