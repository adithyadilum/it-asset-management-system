'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Wrench, X } from 'lucide-react';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';

interface FlagForRepairDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called with the user's issue note; should resolve after the server action. */
  onConfirm: (issueNote: string) => Promise<void>;
  assetTag?: string;
  assetName?: string;
  assetSerial?: string;
}

const MAX_ISSUE_LENGTH = 1000;

export function FlagForRepairDialog({
  isOpen,
  onClose,
  onConfirm,
  assetTag,
  assetName,
  assetSerial,
}: FlagForRepairDialogProps) {
  const [issueNote, setIssueNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    if (isSubmitting) return;
    setIssueNote('');
    setError(null);
    setSubmitError(null);
    onClose();
  };

  const handleConfirm = async () => {
    const trimmed = issueNote.trim();
    if (!trimmed) {
      setError('Please describe the issue before submitting.');
      return;
    }
    if (trimmed.length > MAX_ISSUE_LENGTH) {
      setError(`Description must be ${MAX_ISSUE_LENGTH} characters or fewer.`);
      return;
    }

    setError(null);
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await onConfirm(trimmed);
      setIssueNote('');
      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Failed to flag asset for repair.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const remaining = MAX_ISSUE_LENGTH - issueNote.length;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px] w-full p-6 bg-background rounded-xl shadow-lg border border-border [&>button]:hidden flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <DialogTitle
            className={`flex items-center gap-2 ${TYPOGRAPHY_CLASSNAMES.textLgSemiBold} text-foreground`}
          >
            <Wrench className="h-5 w-5 opacity-70" strokeWidth={1.5} />
            Flag Asset for Repair
          </DialogTitle>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-foreground opacity-70 hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        {/* Asset Summary */}
        <div className="bg-muted/30 border border-border rounded-lg px-6 py-4">
          <div
            className={`grid grid-cols-[100px_1fr] gap-x-6 gap-y-1.5 ${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-foreground`}
          >
            <span className={TYPOGRAPHY_CLASSNAMES.textSmMedium}>
              Asset ID:
            </span>
            <span className="truncate">{assetTag || 'N/A'}</span>

            <span className={TYPOGRAPHY_CLASSNAMES.textSmMedium}>Name:</span>
            <span className="truncate">{assetName || 'N/A'}</span>

            <span className={TYPOGRAPHY_CLASSNAMES.textSmMedium}>Serial:</span>
            <span className="truncate">{assetSerial || 'N/A'}</span>
          </div>
        </div>

        {/* Issue Note Field */}
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="flag-repair-issue"
            className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground flex items-baseline gap-1`}
          >
            Describe the Issue <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="flag-repair-issue"
            placeholder="e.g. Screen is cracked, power button unresponsive, battery not charging…"
            value={issueNote}
            onChange={(e) => {
              setIssueNote(e.target.value);
              if (error) setError(null);
            }}
            disabled={isSubmitting}
            rows={4}
            maxLength={MAX_ISSUE_LENGTH}
            className={`resize-none border-input bg-background rounded-lg px-3 py-2 ${TYPOGRAPHY_CLASSNAMES.textSmRegular} ${error ? 'border-destructive' : ''}`}
          />
          <div className="flex items-start justify-between gap-2">
            {error ? (
              <p
                className={`${TYPOGRAPHY_CLASSNAMES.textXsRegular} text-destructive`}
              >
                {error}
              </p>
            ) : (
              <span />
            )}
            <span
              className={`${TYPOGRAPHY_CLASSNAMES.textXsRegular} text-muted-foreground shrink-0`}
            >
              {remaining} / {MAX_ISSUE_LENGTH}
            </span>
          </div>
        </div>

        {/* Submit Error */}
        {submitError && (
          <div className="rounded-md bg-destructive/10 p-3">
            <p
              className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-destructive`}
            >
              {submitError}
            </p>
          </div>
        )}

        {/* Footer */}
        <DialogFooter className="flex items-center gap-2 sm:justify-end mt-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="h-9 px-4 bg-secondary border border-border text-secondary-foreground hover:bg-secondary/80 shadow-sm rounded-lg"
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleConfirm()}
            disabled={isSubmitting || issueNote.trim().length === 0}
            className="h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm rounded-lg disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting…' : 'Submit for Review'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
