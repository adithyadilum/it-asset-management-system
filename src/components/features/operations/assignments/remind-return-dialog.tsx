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
import { sendAssignmentReminderAction } from '@/actions/assignments';
import { tiqriToast } from '@/components/shared/sonner';

export interface RemindReturnDialogProps {
  isOpen: boolean;
  onClose: () => void;
  assignmentId: number;
  assetLabel: string;
  onSuccess?: () => void;
}

export function RemindReturnDialog({
  isOpen,
  onClose,
  assignmentId,
  assetLabel,
  onSuccess,
}: RemindReturnDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      const result = await sendAssignmentReminderAction([assignmentId]);
      if (result.success) {
        tiqriToast.success('Reminder sent successfully.');
        onSuccess?.();
        onClose();
      } else {
        tiqriToast.error(result.error || 'Failed to send reminder.');
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
          <DialogTitle>Send Reminder</DialogTitle>
          <DialogDescription>
            Are you sure you want to send another return reminder for{' '}
            {assetLabel}? This will send a new notification to the assigned
            user.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send Reminder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
