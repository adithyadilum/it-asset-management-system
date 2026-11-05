'use client';

import { useState } from 'react';
import { DAY_MS, localDate, reportDate } from '@/lib/reporting-time';

import { renewSoftwareLicenseAction } from '@/actions/software';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CUSTOM_DURATION_VALUE,
  DURATION_OPTIONS,
  calculateExpectedReturnDate,
  findDurationPreset,
} from '@/lib/assignment-date-utils';

interface RenewLicenseDialogProps {
  isOpen: boolean;
  assetId: string;
  currentExpiry?: string | null;
  currentSeats?: number | null;
  onOpenChange: (open: boolean) => void;
  onRenewed?: () => void;
}

/**
 * Extends a software licence's term, and its seat count at the same time.
 *
 * Renewal is when seats are usually bought, so making it a second trip through
 * the edit panel would be busywork. Terms reuse the same presets as assignment
 * return dates rather than inventing a second vocabulary for "one year".
 */
export function RenewLicenseDialog({
  isOpen,
  assetId,
  currentExpiry,
  currentSeats,
  onOpenChange,
  onRenewed,
}: RenewLicenseDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {/* Remounted per open, so the form's defaults come from useState
          initialisers rather than an effect that writes state on mount. */}
      {isOpen ? (
        <RenewLicenseForm
          key={assetId}
          assetId={assetId}
          currentExpiry={currentExpiry}
          currentSeats={currentSeats}
          onOpenChange={onOpenChange}
          onRenewed={onRenewed}
        />
      ) : null}
    </Dialog>
  );
}

function RenewLicenseForm({
  assetId,
  currentExpiry,
  currentSeats,
  onOpenChange,
  onRenewed,
}: Omit<RenewLicenseDialogProps, 'isOpen'>) {
  const [term, setTerm] = useState('1y');
  const [expiryDate, setExpiryDate] = useState(() =>
    calculateExpectedReturnDate('1y')
  );
  const [seats, setSeats] = useState(() =>
    currentSeats ? String(currentSeats) : ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [renewalAmount, setRenewalAmount] = useState('');
  const [renewalCurrency, setRenewalCurrency] = useState<'LKR' | 'USD' | 'NOK'>(
    'LKR'
  );
  const [renewalExchangeRate, setRenewalExchangeRate] = useState('');
  const [coverageStart, setCoverageStart] = useState(() =>
    currentExpiry && currentExpiry >= localDate(Date.now())
      ? localDate(reportDate(currentExpiry) + DAY_MS)
      : localDate(Date.now())
  );

  const handleTermChange = (value: string) => {
    setTerm(value);
    if (value === CUSTOM_DURATION_VALUE) return;
    setExpiryDate(calculateExpectedReturnDate(value));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await renewSoftwareLicenseAction({
        assetId,
        expiryDate: expiryDate || undefined,
        // Sent as a string so the shared coercion in the schema handles it.
        totalSeats: seats || undefined,
        renewalAmount,
        renewalCurrency,
        renewalExchangeRate: renewalExchangeRate || undefined,
        coverageStart,
      } as never);

      if (!result.success) {
        tiqriToast.error(result.error);
        return;
      }

      tiqriToast.success('Licence renewed.');
      onOpenChange(false);
      onRenewed?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent className="max-w-[440px]">
      <DialogHeader>
        <DialogTitle>Renew licence</DialogTitle>
        <DialogDescription>
          {currentExpiry
            ? `Currently expires ${currentExpiry}.`
            : 'This licence has no expiry date recorded.'}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2">
        <div className="space-y-1.5">
          <Label htmlFor="renew-coverage">Paid coverage starts</Label>
          <Input
            id="renew-coverage"
            type="date"
            value={coverageStart}
            onChange={(event) => setCoverageStart(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="renew-amount">Total renewal cost</Label>
          <Input
            id="renew-amount"
            type="number"
            min="0"
            step="0.01"
            value={renewalAmount}
            onChange={(event) => setRenewalAmount(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="renew-currency">Cost currency</Label>
          <select
            id="renew-currency"
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            value={renewalCurrency}
            onChange={(event) =>
              setRenewalCurrency(event.target.value as 'LKR' | 'USD' | 'NOK')
            }
          >
            {['LKR', 'USD', 'NOK'].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        {renewalCurrency !== 'LKR' && (
          <div className="space-y-1.5">
            <Label htmlFor="renew-rate">
              Recorded exchange rate to LKR (optional)
            </Label>
            <Input
              id="renew-rate"
              type="number"
              min="0"
              step="0.000001"
              value={renewalExchangeRate}
              onChange={(event) => setRenewalExchangeRate(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to capture the rate available when recording this
              payment.
            </p>
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Renewal term</Label>
          <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-2">
            <Select value={term} onValueChange={handleTermChange}>
              <SelectTrigger className="h-9">
                <SelectValue>
                  {findDurationPreset(term)?.label ?? 'Custom'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.filter((option) => option.months).map(
                  (option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  )
                )}
                <SelectItem value={CUSTOM_DURATION_VALUE}>Custom</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              className="h-9"
              value={expiryDate}
              onChange={(event) => {
                setExpiryDate(event.target.value);
                setTerm(CUSTOM_DURATION_VALUE);
              }}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="renew-seats">Total seats</Label>
          <Input
            id="renew-seats"
            type="number"
            min={1}
            className="h-9"
            value={seats}
            onChange={(event) => setSeats(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Reducing below the number currently allocated is refused.
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={
            isSubmitting ||
            (!expiryDate && !seats) ||
            !renewalAmount ||
            !coverageStart
          }
        >
          {isSubmitting ? 'Renewing…' : 'Renew licence'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
