'use client';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

import * as React from 'react';
import { TriangleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { rejectAssignmentAction } from '@/actions/employee';
import { tiqriToast } from '@/components/shared/sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { PendingAcceptanceItem } from '@/lib/data/portal-repo';

interface RejectionDialogProps {
  isOpen: boolean;
  assignment: PendingAcceptanceItem | null;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function RejectionDialog({
  isOpen,
  assignment,
  onOpenChange,
  onSuccess,
}: RejectionDialogProps) {
  const router = useRouter();
  const [reason, setReason] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const resetState = React.useCallback(() => {
    setReason('');
    setIsSubmitting(false);
  }, []);

  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        resetState();
      }
      onOpenChange(open);
    },
    [onOpenChange, resetState]
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!assignment) {
      tiqriToast.error('No assignment is selected.');
      return;
    }

    const trimmedReason = reason.trim();
    if (trimmedReason.length < 10) {
      tiqriToast.warning('Please provide at least 10 characters.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await rejectAssignmentAction(
        assignment.assignmentId,
        trimmedReason
      );

      if (!result.success) {
        throw new Error(result.error ?? 'Failed to submit the report.');
      }

      tiqriToast.success('Report submitted successfully.');
      resetState();
      handleOpenChange(false);
      onSuccess?.();
      router.refresh();
    } catch (error) {
      tiqriToast.error(
        error instanceof Error ? error.message : 'Failed to submit the report.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="w-[92vw] gap-4 rounded-xl p-0 sm:max-w-130"
        showCloseButton={false}
      >
        <div className="border-b border-border px-6 pt-6 pb-4">
          <DialogHeader className="gap-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <TriangleAlert className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-lg font-semibold text-foreground">
                  Report Issue
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Use this form if the asset was not received or there is a
                  blocking issue with the assignment.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 pb-6">
          <div className="space-y-2">
            <Label
              htmlFor="portal-rejection-reason"
              className="text-sm font-medium text-foreground"
            >
              Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="portal-rejection-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Explain why you did not receive the asset or why the assignment should be rejected..."
              className="min-h-28 resize-none"
              disabled={isSubmitting}
            />
            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>Minimum 10 characters required.</span>
              <span>{reason.trim().length}/500</span>
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-border bg-transparent px-0 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || reason.trim().length < 10}
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  Submitting...
                </span>
              ) : (
                'Submit Report'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
