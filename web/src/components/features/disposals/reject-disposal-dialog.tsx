'use client';

import { useState, useTransition } from 'react';
import { AlertCircle } from 'lucide-react'; 

import { rejectDisposalRequest } from '@/actions/disposals';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { tiqriToast } from '@/components/shared/sonner';

interface RejectDisposalDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  disposalId: number;
  assetId: string;
  assetName: string;
  assetTag: string;
  onSuccess: () => void;
}

export function RejectDisposalDialog({
  isOpen,
  onOpenChange,
  disposalId,
  assetId,
  assetName,
  assetTag,
  onSuccess,
}: RejectDisposalDialogProps) {
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState('Available');
  const [isPending, startTransition] = useTransition();

  const isValid = reason.trim().length >= 10 && status.length > 0;

  const handleReset = () => {
    setReason('');
    setStatus('Available');
  };

  const handleSubmit = () => {
    if (!isValid) return;

    startTransition(async () => {
      try {
        const result = await rejectDisposalRequest(disposalId, assetId, reason, status);
        if (result.success) {
          tiqriToast.success('Disposal request successfully rejected.');
          handleReset();
          onSuccess();
        }
      } catch (error) {
        tiqriToast.error(error instanceof Error ? error.message : 'Failed to reject request.');
      }
    });
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) handleReset();
      }}
    >
      <DialogContent className="sm:max-w-[500px] rounded-xl">
        {/* Header Section */}
        <DialogHeader className="relative pr-8">
          <div className="flex items-center gap-2 text-foreground">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            <DialogTitle className="text-xl font-bold">Reject Disposal Request</DialogTitle>
          </div>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            You are declining the disposal of <strong className="text-foreground font-semibold">{assetName} ({assetTag})</strong>.
          </p>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Rejection Reason */}
          <div className="grid gap-2">
            <Label htmlFor="reason" className="text-[13px] font-semibold text-foreground">
              Rejection Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Device is still under manufacturer warranty. Please initiate an RMA with Lenovo..."
              className="min-h-[100px] resize-none bg-background border-input focus-visible:ring-ring"
            />
            {reason.length > 0 && reason.length < 10 && (
              <p className="text-[11px] text-destructive font-medium">Minimum 10 characters required.</p>
            )}
          </div>

          {/* Fallback Status Dropdown */}
          <div className="grid gap-2">
            <Label htmlFor="status" className="text-[13px] font-semibold text-foreground">
              Update Status To <span className="text-destructive">*</span>
            </Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full h-10 bg-background border-input text-foreground focus:ring-ring">
                <SelectValue placeholder="Select fallback status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Available">Available</SelectItem>
                <SelectItem value="In Repair">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          {/* Shadcn's outline variant automatically handles the border, bg, and hover states using variables */}
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="h-10 px-6 font-medium"
          >
            Cancel
          </Button>
          {/* Standard primary button classes tied to global CSS variables */}
          <Button
            type="button"
            disabled={!isValid || isPending}
            onClick={handleSubmit}
            className="h-10 px-6 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-md transition-all active:scale-95"
          >
            {isPending ? 'Processing...' : 'Confirm Rejection'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}