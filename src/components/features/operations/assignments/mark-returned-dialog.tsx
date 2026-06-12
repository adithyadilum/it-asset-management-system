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
import { markAssetReceivedAction } from '@/actions/assignments';
import { tiqriToast } from '@/components/shared/sonner';

export interface MarkReturnedDialogProps {
  isOpen: boolean;
  onClose: () => void;
  assignmentId: number;
  assetLabel: string;
  onSuccess?: () => void;
}

export function MarkReturnedDialog({
  isOpen,
  onClose,
  assignmentId,
  assetLabel,
  onSuccess,
}: MarkReturnedDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      const result = await markAssetReceivedAction([assignmentId]);
      if (result.success) {
        tiqriToast.success('Asset marked as returned successfully.');
        onSuccess?.();
        onClose();
      } else {
        tiqriToast.error(result.error || 'Failed to mark as returned.');
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
          <DialogTitle>Mark Returned</DialogTitle>
          <DialogDescription>
            Are you sure you want to mark {assetLabel} as physically returned?
            This will update the asset status and resolve the active return request.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? 'Marking...' : 'Mark Returned'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
