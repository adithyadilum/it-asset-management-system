'use client';

import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { getAssetMaintenanceHistory } from '@/actions/maintenance';
import type { AssetMaintenanceRecord } from '@/types/maintenance';

interface RecentMaintenanceProps {
  assetTag: string;
  isOpen?: boolean;
  onViewAll?: () => void;
}

export function RecentMaintenance({ assetTag, isOpen = true, onViewAll }: RecentMaintenanceProps) {
  const [maintenanceHistory, setMaintenanceHistory] = useState<AssetMaintenanceRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    async function fetchHistory() {
      if (!assetTag) return;

      try {
        setIsLoadingHistory(true);
        const history = await getAssetMaintenanceHistory(assetTag, 3);
        setMaintenanceHistory(history);
      } catch (error) {
        console.error('Failed to fetch maintenance history:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    }

    if (isOpen) {
      fetchHistory();
    }
  }, [assetTag, isOpen]);

  return (
    <div className="mt-8 shrink-0 px-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] font-semibold text-slate-900 flex items-center gap-2">
          Recent Maintenance
        </h3>
        {maintenanceHistory.length > 0 && onViewAll && (
          <button onClick={onViewAll} className="text-[13px] text-[#040d5a] hover:underline font-medium">
            View All
          </button>
        )}
      </div>

      {isLoadingHistory ? (
        <div className="space-y-3">
          <div className="h-20 bg-slate-100 rounded-lg animate-pulse" />
          <div className="h-20 bg-slate-100 rounded-lg animate-pulse" />
        </div>
      ) : maintenanceHistory.length > 0 ? (
        <div className="space-y-3">
          {maintenanceHistory.map((record) => (
            <div key={record.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50">
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium text-[14px] text-slate-900">
                  {record.ticketType === 'VENDOR' ? record.vendorName : 'Internal Repair'}
                </span>
                <Badge
                  variant="outline"
                  className={
                    record.status === 'COMPLETED'
                      ? 'bg-green-50 text-green-700 border-green-200 font-normal shadow-sm'
                      : record.status === 'ACTIVE'
                        ? 'bg-blue-50 text-blue-700 border-blue-200 font-normal shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 font-normal shadow-sm'
                  }
                >
                  {record.status}
                </Badge>
              </div>

              <p className="text-[13px] text-slate-600 mb-3 line-clamp-2">
                {record.reportedIssue}
              </p>

              <div className="flex justify-between items-center text-[12px] text-slate-500 font-medium pt-3 border-t border-slate-200/60">
                <span>
                  {record.actualCompletionDate
                    ? new Date(record.actualCompletionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'In Progress'}
                </span>
                {record.actualCost && (
                  <span className="text-slate-700">
                    ${parseFloat(record.actualCost).toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center p-6 border border-dashed border-slate-200 rounded-xl bg-slate-50">
          <p className="text-sm text-slate-500">No maintenance records found.</p>
        </div>
      )}
    </div>
  );
}
