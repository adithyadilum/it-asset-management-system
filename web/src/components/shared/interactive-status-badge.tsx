'use client';

import React, { useState, useTransition } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { tiqriToast } from '@/components/shared/sonner';
import { manualStatusOverrideAction } from '@/actions/assets';
import { cn } from '@/lib/utils';

interface InteractiveStatusBadgeProps {
  assetId: string;
  currentStatus: string;
  availableStatuses: Array<{ value: string; label: string; color?: string }>;
  onStatusChanged?: (nextStatus: string) => void;
  className?: string;
}

export function InteractiveStatusBadge({
  assetId,
  currentStatus,
  availableStatuses,
  onStatusChanged,
  className,
}: InteractiveStatusBadgeProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [reasonNote, setReasonNote] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [localStatus, setLocalStatus] = useState(currentStatus);
  const [prevCurrentStatus, setPrevCurrentStatus] = useState(currentStatus);

  // Sync local status when currentStatus prop changes from parent
  if (currentStatus !== prevCurrentStatus) {
    setLocalStatus(currentStatus);
    setPrevCurrentStatus(currentStatus);
  }

  const handleStatusSelect = (status: string) => {
    if (status === currentStatus) return;
    setSelectedStatus(status);
    setReasonNote('');
    setIsModalOpen(true);
  };

  const handleConfirm = () => {
    if (!selectedStatus || reasonNote.trim().length < 10) return;

    startTransition(async () => {
      try {
        const result = await manualStatusOverrideAction(
          assetId,
          selectedStatus,
          reasonNote
        );

        if (result.success) {
          tiqriToast.success(result.message);
          setLocalStatus(selectedStatus);
          setIsModalOpen(false);
          onStatusChanged?.(selectedStatus);
        } else {
          tiqriToast.error(result.message);
        }
      } catch (error) {
        console.error('Failed to update status:', error);
        tiqriToast.error('An unexpected error occurred.');
      }
    });
  };

  const filteredStatuses = availableStatuses.filter(
    (s) => s.value !== localStatus
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div
            className={cn(
              'group cursor-pointer inline-flex items-center transition-all duration-150 active:scale-95',
              className
            )}
          >
            <StatusBadge
              value={localStatus}
              showIcon
              className="group-hover:ring-2 group-hover:ring-slate-200 group-hover:scale-[1.02] transition-all duration-150"
            />
            <ChevronDown className="h-3 w-3 ml-1 text-slate-400 group-hover:text-slate-600 transition-colors" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {filteredStatuses.length > 0 ? (
            filteredStatuses.map((status) => (
              <DropdownMenuItem
                key={status.value}
                onClick={() => handleStatusSelect(status.value)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <StatusBadge value={status.value} showIcon />
              </DropdownMenuItem>
            ))
          ) : (
            <div className="p-2 text-xs text-slate-500 italic">
              No manual overrides available
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Asset Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between px-1 text-sm">
              <div className="flex flex-col gap-1">
                <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">
                  Current
                </span>
                <StatusBadge value={localStatus} />
              </div>
              <div className="text-slate-300">→</div>
              <div className="flex flex-col gap-1 items-end">
                <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">
                  New
                </span>
                <StatusBadge value={selectedStatus ?? ''} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Justification <span className="text-rose-500">*</span>
              </label>
              <Textarea
                placeholder="Reason for manual status change (e.g., Asset reported lost by employee)"
                value={reasonNote}
                onChange={(e) => setReasonNote(e.target.value)}
                className="min-h-24 resize-none"
              />
              <div className="flex justify-between items-center text-[11px]">
                <span
                  className={cn(
                    reasonNote.trim().length < 10
                      ? 'text-rose-500'
                      : 'text-emerald-600'
                  )}
                >
                  {reasonNote.trim().length} / 10 characters minimum
                </span>
                <span className="text-slate-400">Required for audit trail</span>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isPending || reasonNote.trim().length < 10}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
