'use client';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';

interface ResolveInternallyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (resolutionNote: string) => Promise<void>;
  isLoading?: boolean;
}

export function ResolveInternallyDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: ResolveInternallyDialogProps) {
  const [resolutionNote, setResolutionNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!resolutionNote.trim()) {
      setError('Resolution note is required');
      return;
    }

    try {
      setError(null);
      await onConfirm(resolutionNote.trim());
      setResolutionNote('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve issue');
    }
  };

  const handleClose = () => {
    setResolutionNote('');
    setError(null);
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-md bg-background border-border">
        <AlertDialogHeader>
          <AlertDialogTitle
            className={`${TYPOGRAPHY_CLASSNAMES.textLgSemiBold} text-foreground`}
          >
            Resolve Issue Internally
          </AlertDialogTitle>
          <AlertDialogDescription
            className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}
          >
            Resolving this issue will update the asset status to
            &quot;Available&quot;, update the maintenance ticket, and add an
            audit log entry.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label
              htmlFor="resolution-note"
              className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}
            >
              Resolution Note <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="resolution-note"
              placeholder="Describe how the issue was resolved..."
              value={resolutionNote}
              onChange={(e) => {
                setResolutionNote(e.target.value);
                setError(null);
              }}
              className={`min-h-24 resize-none border-input focus-visible:ring-ring ${TYPOGRAPHY_CLASSNAMES.textSmRegular}`}
              disabled={isLoading}
            />
            <p
              className={`${TYPOGRAPHY_CLASSNAMES.textXsRegular} text-muted-foreground`}
            >
              {resolutionNote.length}/500 characters
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 border border-destructive/20">
              <p
                className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-destructive`}
              >
                {error}
              </p>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isLoading}
            className="border-border text-foreground hover:bg-muted/50"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading || !resolutionNote.trim()}
            className="bg-success text-success-foreground hover:bg-success/90"
          >
            {isLoading ? 'Resolving...' : 'Resolve Internally'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
