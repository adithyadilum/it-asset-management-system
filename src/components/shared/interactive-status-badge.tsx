'use client';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

import { useState, useTransition } from 'react';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, ChevronDown, ArrowRight } from 'lucide-react';
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
  DialogDescription,
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
  availableStatuses: Array<{
    value: string;
    label: string;
    colorTheme?: string;
    iconName?: string;
  }>;
  hasActiveAssignment?: boolean;
  onStatusChanged?: (nextStatus: string) => void;
  className?: string;
}

export function InteractiveStatusBadge({
  assetId,
  currentStatus,
  availableStatuses,
  hasActiveAssignment,
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

  const selectedStatusConfig = availableStatuses.find(
    (s) => s.value === selectedStatus
  );
  const currentStatusConfig = availableStatuses.find(
    (s) => s.value === localStatus
  );

  const isLockedStatus =
    localStatus === 'Disposed' || localStatus === 'Pending Disposal';

  if (isLockedStatus) {
    return (
      <div className={cn('inline-flex items-center', className)}>
        <StatusBadge
          value={localStatus}
          showIcon
          colorTheme={currentStatusConfig?.colorTheme}
          iconName={currentStatusConfig?.iconName}
        />
      </div>
    );
  }

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
              colorTheme={currentStatusConfig?.colorTheme}
              iconName={currentStatusConfig?.iconName}
              className="group-hover:ring-2 group-hover:ring-border group-hover:scale-[1.02] transition-all duration-150"
            />
            <ChevronDown className="h-3 w-3 ml-1 text-muted-foreground group-hover:text-muted-foreground transition-colors" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48 p-1">
          {filteredStatuses.length > 0 ? (
            filteredStatuses.map((status) => (
              <DropdownMenuItem
                key={status.value}
                onClick={() => handleStatusSelect(status.value)}
                className="flex items-center gap-2 cursor-pointer p-1 rounded-md"
              >
                <StatusBadge
                  value={status.value}
                  showIcon
                  colorTheme={status.colorTheme}
                  iconName={status.iconName}
                  className="w-full justify-start border-none bg-transparent"
                />
              </DropdownMenuItem>
            ))
          ) : (
            <div className="p-2 text-xs text-muted-foreground italic">
              No manual overrides available
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Asset Status</DialogTitle>
            <DialogDescription>
              Manually overriding the status will bypass the standard workflow
              and be recorded in the audit logs.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="flex items-center justify-center gap-4 py-2">
              <StatusBadge
                value={localStatus}
                showIcon
                colorTheme={currentStatusConfig?.colorTheme}
                iconName={currentStatusConfig?.iconName}
              />
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <StatusBadge
                value={selectedStatus ?? ''}
                showIcon
                colorTheme={selectedStatusConfig?.colorTheme}
                iconName={selectedStatusConfig?.iconName}
              />
            </div>

            {hasActiveAssignment && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  This asset is currently assigned. Overriding the status will
                  automatically terminate the active assignment.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="reason">Justification</Label>
                <span
                  className={cn(
                    'text-[11px] font-medium',
                    reasonNote.trim().length < 10
                      ? 'text-destructive'
                      : 'text-emerald-600'
                  )}
                >
                  {reasonNote.trim().length} / 10 characters
                </span>
              </div>
              <Textarea
                id="reason"
                placeholder="Briefly explain the reason for this manual change..."
                value={reasonNote}
                onChange={(e) => setReasonNote(e.target.value)}
                className="min-h-[100px] resize-none"
              />
            </div>
          </div>

          <DialogFooter>
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
              {isPending && <LoadingSpinner size="sm" />}
              Confirm Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
