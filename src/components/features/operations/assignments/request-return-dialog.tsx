'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { requestAssetReturnAction } from '@/actions/assignments';
import { tiqriToast } from '@/components/shared/sonner';

export interface RequestReturnDialogProps {
  isOpen: boolean;
  onClose: () => void;
  assignmentId: number;
  assetLabel: string;
  onSuccess?: () => void;
}

export function RequestReturnDialog({
  isOpen,
  onClose,
  assignmentId,
  assetLabel,
  onSuccess,
}: RequestReturnDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      const result = await requestAssetReturnAction([assignmentId]);
      if (result.success) {
        tiqriToast.success('Return requested successfully.');
        onSuccess?.();
        onClose();
      } else {
        tiqriToast.error(result.error || 'Failed to request return.');
      }
    } catch {
      tiqriToast.error('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Return</DialogTitle>
          <DialogDescription>
            Are you sure you want to request the return of {assetLabel}? This
            will notify the assigned user.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? 'Requesting...' : 'Request Return'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
