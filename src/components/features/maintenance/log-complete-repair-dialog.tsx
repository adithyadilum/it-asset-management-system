'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { CheckSquare, X } from 'lucide-react';
import type {
  ActiveRepairTicket,
  CompleteRepairFormData,
} from '@/types/maintenance';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { formatMoneyByCurrency, resolveCurrencyCode } from '@/lib/currency';
import { cn } from '@/lib/utils';

/** Matches the rejection dialogs, which have asked for ten characters all along. */
const MIN_RESOLUTION_NOTE_LENGTH = 10;
const MAX_RESOLUTION_NOTE_LENGTH = 500;

interface LogCompleteRepairDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: CompleteRepairFormData) => Promise<void>;
  isLoading?: boolean;
  /** The repair being closed out, for the read-only summary and the estimate. */
  ticket?: ActiveRepairTicket | null;
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  return isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

/** One labelled line of the read-only ticket summary. */
function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} truncate text-foreground`}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * Closing out a vendor repair.
 *
 * The form used to be three inputs with no context: the reviewer could not see
 * which asset they were closing, who had it, or what the repair was quoted at,
 * so "did this come in over estimate?" meant opening the ticket in another tab.
 * The ticket details are read-only here; only the fields being entered are
 * editable.
 */
export function LogCompleteRepairDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  ticket,
}: LogCompleteRepairDialogProps) {
  const ticketCurrency = resolveCurrencyCode(ticket?.currencyCode || 'LKR');

  const [formData, setFormData] = useState<CompleteRepairFormData>({
    actualCost: '',
    // Was a `defaultValue` on an uncontrolled Select that nothing ever read, so
    // whichever currency you picked, the amount was stored bare.
    currencyCode: ticketCurrency,
    resolutionNotes: '',
    updateStatusTo: 'Available',
  });

  const resetForm = () =>
    setFormData({
      actualCost: '',
      currencyCode: ticketCurrency,
      resolutionNotes: '',
      updateStatusTo: 'Available',
    });

  const handleConfirm = async () => {
    try {
      await onConfirm(formData);
      resetForm();
    } catch (err) {
      console.error(err);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      resetForm();
      onClose();
    }
  };

  const noteLength = formData.resolutionNotes.trim().length;
  const isFormValid =
    formData.actualCost.trim() !== '' &&
    noteLength >= MIN_RESOLUTION_NOTE_LENGTH;

  const estimate = ticket?.estimatedCost
    ? Number.parseFloat(ticket.estimatedCost)
    : null;
  const actual = formData.actualCost
    ? Number.parseFloat(formData.actualCost)
    : null;
  const variance =
    estimate !== null &&
    actual !== null &&
    Number.isFinite(estimate) &&
    Number.isFinite(actual)
      ? actual - estimate
      : null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[520px] p-6 bg-background rounded-xl shadow-lg border border-border [&>button]:hidden">
        <div className="absolute right-4 top-4">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <DialogHeader className="pb-2">
          <DialogTitle
            className={`flex items-center gap-2 ${TYPOGRAPHY_CLASSNAMES.textLgSemiBold} text-foreground`}
          >
            <CheckSquare
              className="h-6 w-6 text-muted-foreground"
              strokeWidth={1.5}
            />
            Log Completed Repair
          </DialogTitle>
        </DialogHeader>

        {ticket ? (
          <div className="space-y-1.5 rounded-lg border border-border bg-muted/40 p-3">
            <SummaryRow
              label="Asset"
              value={ticket.asset?.assetTag ?? ticket.assetId}
            />
            <SummaryRow label="Vendor" value={ticket.vendorName || '—'} />
            <SummaryRow label="RMA" value={ticket.rmaNumber || '—'} />
            <SummaryRow
              label="Dispatched"
              value={formatDate(ticket.createdAt)}
            />
            <SummaryRow
              label="Expected back"
              value={formatDate(ticket.estimatedReturnDate)}
            />
            <SummaryRow
              label="Reported issue"
              value={ticket.reportedIssue || '—'}
            />
          </div>
        ) : null}

        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <Label
                htmlFor="repair-actual-cost"
                className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}
              >
                Actual Final Cost: <span className="text-destructive">*</span>
              </Label>
              {estimate !== null && Number.isFinite(estimate) ? (
                <span className="text-xs text-muted-foreground">
                  Estimated {formatMoneyByCurrency(estimate, ticketCurrency)}
                </span>
              ) : null}
            </div>
            <div className="flex">
              <Select
                value={formData.currencyCode}
                onValueChange={(value) =>
                  setFormData({ ...formData, currencyCode: value })
                }
                disabled={isLoading}
              >
                <SelectTrigger className="w-[80px] rounded-r-none border-r-0 focus:ring-0 focus:border-border bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LKR">Rs</SelectItem>
                  <SelectItem value="USD">$</SelectItem>
                  <SelectItem value="NOK">kr</SelectItem>
                </SelectContent>
              </Select>
              <Input
                id="repair-actual-cost"
                type="number"
                placeholder="10.00"
                step="0.01"
                min="0"
                value={formData.actualCost}
                onChange={(e) =>
                  setFormData({ ...formData, actualCost: e.target.value })
                }
                disabled={isLoading}
                className={`flex-1 rounded-l-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring ${TYPOGRAPHY_CLASSNAMES.textSmRegular}`}
              />
            </div>
            {/* "Did this come in over estimate?" is the reviewer's actual
                question, and it was answerable only by opening the ticket
                elsewhere. */}
            {variance !== null ? (
              <p
                className={cn(
                  'text-xs',
                  variance > 0 ? 'text-amber-600' : 'text-emerald-600'
                )}
              >
                {variance === 0
                  ? 'On estimate.'
                  : `${formatMoneyByCurrency(
                      Math.abs(variance),
                      formData.currencyCode
                    )} ${variance > 0 ? 'over' : 'under'} estimate.`}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="repair-resolution-notes"
              className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}
            >
              Resolution Notes <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="repair-resolution-notes"
              placeholder='e.g., "Replaced display cable"'
              maxLength={MAX_RESOLUTION_NOTE_LENGTH}
              value={formData.resolutionNotes}
              onChange={(e) =>
                setFormData({ ...formData, resolutionNotes: e.target.value })
              }
              disabled={isLoading}
              className={`min-h-[100px] resize-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring ${TYPOGRAPHY_CLASSNAMES.textSmRegular}`}
            />
            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>
                Minimum {MIN_RESOLUTION_NOTE_LENGTH} characters required.
              </span>
              <span>
                {noteLength}/{MAX_RESOLUTION_NOTE_LENGTH}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label
              className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}
            >
              Update Status To <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.updateStatusTo}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  updateStatusTo: value as 'Available' | 'Disposed',
                })
              }
              disabled={isLoading}
            >
              <SelectTrigger
                className={`w-full focus:ring-1 focus:ring-ring bg-background ${TYPOGRAPHY_CLASSNAMES.textSmRegular}`}
              >
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent className={TYPOGRAPHY_CLASSNAMES.textSmRegular}>
                <SelectItem value="Available">Available</SelectItem>
                <SelectItem value="Disposed">Disposed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="pt-6 sm:justify-end gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="border-border text-foreground hover:bg-muted/50 min-w-[100px]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || !isFormValid}
            className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[100px]"
          >
            {isLoading ? 'Saving...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
