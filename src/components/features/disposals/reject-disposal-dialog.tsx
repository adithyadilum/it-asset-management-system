'use client';

import { useState, useTransition } from 'react';
import { AlertCircle } from 'lucide-react';

import { rejectDisposalRequest } from '@/actions/disposals/reject';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { tiqriToast } from '@/components/shared/sonner';

import type { PendingDisposalRow } from '@/types/disposals';

interface RejectDisposalDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAssets: PendingDisposalRow[];
  onSuccess: () => void;
}

export function RejectDisposalDialog({
  isOpen,
  onOpenChange,
  selectedAssets,
  onSuccess,
}: RejectDisposalDialogProps) {
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState('Available');
  const [maintenanceIssue, setMaintenanceIssue] = useState('');
  const [isPending, startTransition] = useTransition();

  const isBulk = selectedAssets.length > 1;
  const singleAsset = selectedAssets[0];

  // 'In Repair' requires a maintenance description to be valid.
  const isValid =
    selectedAssets.length > 0 &&
    reason.trim().length >= 10 &&
    status.length > 0 &&
    (status !== 'In Repair' || maintenanceIssue.trim().length > 0);

  const handleReset = () => {
    setReason('');
    setStatus('Available');
    setMaintenanceIssue('');
  };

  const handleSubmit = () => {
    if (!isValid) return;

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set(
          'disposalIds',
          JSON.stringify(selectedAssets.map((a) => a.id))
        );
        formData.set(
          'assetIds',
          JSON.stringify(selectedAssets.map((a) => a.assetId))
        );
        formData.set('rejectionReason', reason);
        formData.set('fallbackStatus', status);

        if (status === 'In Repair' && maintenanceIssue.trim()) {
          formData.set('maintenanceIssue', maintenanceIssue.trim());
        }

        const result = await rejectDisposalRequest(
          { success: false, message: '' },
          formData
        );

        if (result.success) {
          tiqriToast.success(
            isBulk
              ? `Successfully rejected ${selectedAssets.length} disposal requests.`
              : 'Disposal request successfully rejected.'
          );
          handleReset();
          onSuccess();
          onOpenChange(false);
        } else {
          tiqriToast.error(result.message || 'Failed to reject request.');
        }
      } catch (error) {
        tiqriToast.error(
          error instanceof Error ? error.message : 'Failed to reject request.'
        );
      }
    });
  };

  if (!singleAsset && isOpen) return null;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) handleReset();
      }}
    >
      <DialogContent className="sm:max-w-125 rounded-xl bg-background p-0 overflow-hidden">
        <div className="p-6 pb-2">
          <DialogHeader className="relative">
            <div className="flex items-center gap-2 text-foreground">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
              <DialogTitle className="text-xl font-bold">
                {isBulk ? 'Bulk Reject Requests' : 'Reject Disposal Request'}
              </DialogTitle>
            </div>
            <DialogDescription className="mt-2 text-sm text-muted-foreground leading-relaxed">
              You are declining the disposal of{' '}
              {isBulk ? (
                <strong className="text-foreground font-semibold">
                  {selectedAssets.length} selected assets
                </strong>
              ) : (
                <strong className="text-foreground font-semibold">
                  {singleAsset?.assetName} ({singleAsset?.assetTag})
                </strong>
              )}
              .
            </DialogDescription>
          </DialogHeader>
        </div>

        <ScrollArea className="max-h-[70vh] px-6">
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label
                htmlFor="reason"
                className="text-[13px] font-semibold text-foreground"
              >
                Rejection Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reason"
                autoFocus
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Device is still under manufacturer warranty..."
                className="min-h-25 resize-none bg-background border-input focus-visible:ring-ring"
              />
              {reason.length > 0 && reason.length < 10 && (
                <p className="text-[11px] text-destructive font-medium">
                  Minimum 10 characters required.
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label
                htmlFor="status"
                className="text-[13px] font-semibold text-foreground"
              >
                Update Status To <span className="text-destructive">*</span>
              </Label>
              <Select
                value={status}
                onValueChange={(val) => {
                  setStatus(val);
                  if (val !== 'In Repair') setMaintenanceIssue('');
                }}
              >
                <SelectTrigger className="w-full h-10 bg-background border-input text-foreground focus:ring-ring">
                  <SelectValue placeholder="Select fallback status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Available">Available</SelectItem>
                  <SelectItem value="In Repair">In Repair</SelectItem>
                </SelectContent>
              </Select>
              {isBulk && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  This status will be applied to all {selectedAssets.length}{' '}
                  assets.
                </p>
              )}
            </div>

            {status === 'In Repair' && (
              <div className="grid gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <Label
                  htmlFor="maintenanceIssue"
                  className="text-[13px] font-semibold text-foreground"
                >
                  Maintenance Issue Description{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="maintenanceIssue"
                  value={maintenanceIssue}
                  onChange={(e) => setMaintenanceIssue(e.target.value)}
                  placeholder="Describe the issue for the maintenance team to investigate..."
                  className="min-h-20 resize-none bg-background border-input focus-visible:ring-ring"
                />
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-3 p-6 pt-4 border-t border-border bg-background">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="h-10 px-6 font-medium"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="default"
            disabled={!isValid || isPending}
            onClick={handleSubmit}
            className="h-10 px-6 shadow-md transition-all active:scale-95 border-primary bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isPending
              ? 'Processing...'
              : isBulk
                ? 'Confirm Bulk Rejection'
                : 'Confirm Rejection'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
