'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { Button } from '@/components/ui/button';
import { AlertCircle, X, Laptop, CalendarDays } from 'lucide-react';
import type { Vendor, InitiateRepairFormData } from '@/types/maintenance';
import { format } from 'date-fns';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';

interface InitiateRepairDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: InitiateRepairFormData) => Promise<void>;
  vendors: Vendor[];
  isLoading?: boolean;
  assetId?: string;
  assetName?: string;
  assetSerial?: string;
  reportedBy?: string;
  reportedDate?: Date | string | null;
}

const RMA_PLACEHOLDER = 'e.g. C02XG12345';
const ESTIMATED_COST_PLACEHOLDER = '10.00';

export function InitiateRepairDialog({
  isOpen,
  onClose,
  onConfirm,
  vendors,
  isLoading = false,
  assetId,
  assetName,
  assetSerial,
  reportedBy,
  reportedDate,
}: InitiateRepairDialogProps) {
  const [formData, setFormData] = useState<InitiateRepairFormData>({
    vendorId: '',
    rmaNumber: '',
    estimatedCost: '',
    expectedReturnDate: '',
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof InitiateRepairFormData, string>>
  >({});

  const [submitError, setSubmitError] = useState<string | null>(null);

  const validateForm = () => {
    // ... [Logic remains unchanged]
    const newErrors: typeof errors = {};
    if (!formData.vendorId.trim()) newErrors.vendorId = 'Vendor is required';
    if (!formData.rmaNumber.trim()) {
      newErrors.rmaNumber = 'RMA/Ticket Number is required';
    } else if (formData.rmaNumber.trim().length < 3) {
      newErrors.rmaNumber = 'RMA/Ticket Number must be at least 3 characters';
    }
    if (formData.estimatedCost && isNaN(parseFloat(formData.estimatedCost))) {
      newErrors.estimatedCost = 'Estimated Cost must be a valid number';
    }
    if (formData.expectedReturnDate) {
      const selectedDate = new Date(formData.expectedReturnDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.expectedReturnDate =
          'Expected Return Date must be in the future';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = async () => {
    setSubmitError(null);
    if (!validateForm()) return;
    try {
      await onConfirm(formData);
      setFormData({
        vendorId: '',
        rmaNumber: '',
        estimatedCost: '',
        expectedReturnDate: '',
      });
      setErrors({});
      onClose();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to initiate repair';
      setSubmitError(errorMessage);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setFormData({
        vendorId: '',
        rmaNumber: '',
        estimatedCost: '',
        expectedReturnDate: '',
      });
      setErrors({});
      setSubmitError(null);
      onClose();
    }
  };

  const isFormValid =
    formData.vendorId.trim() !== '' && formData.rmaNumber.trim() !== '';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] w-full p-6 bg-background rounded-xl shadow-lg border border-border [&>button]:hidden flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <DialogTitle
            className={`flex items-center gap-2 ${TYPOGRAPHY_CLASSNAMES.textLgSemiBold} text-foreground`}
          >
            <AlertCircle className="h-6 w-6 opacity-70" strokeWidth={1.5} />
            Send Asset for Repair
          </DialogTitle>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-foreground opacity-70 hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <div className="bg-muted/30 border border-border rounded-lg py-6 flex flex-col items-center gap-6 shadow-sm w-full">
          <div className="flex items-center justify-center gap-3 w-full px-6">
            <Laptop
              className="h-10 w-10 text-foreground shrink-0"
              strokeWidth={1}
            />
            <span
              className={`${TYPOGRAPHY_CLASSNAMES.textLgSemiBold} text-foreground truncate`}
            >
              {assetName || 'Unknown Asset'}
            </span>
          </div>

          <div className="w-full flex justify-center px-6">
            <div
              className={`grid grid-cols-[120px_1fr] gap-x-8 gap-y-2 ${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-foreground w-fit min-w-[280px]`}
            >
              <div className={TYPOGRAPHY_CLASSNAMES.textSmMedium}>
                Asset ID:
              </div>
              <div className="truncate">{assetId || 'N/A'}</div>

              <div className={TYPOGRAPHY_CLASSNAMES.textSmMedium}>Serial:</div>
              <div className="truncate">{assetSerial || 'N/A'}</div>

              <div className={TYPOGRAPHY_CLASSNAMES.textSmMedium}>
                Reported By:
              </div>
              <div className="truncate">{reportedBy || 'N/A'}</div>

              <div className={TYPOGRAPHY_CLASSNAMES.textSmMedium}>Date:</div>
              <div className="truncate">
                {reportedDate
                  ? format(new Date(reportedDate), 'MMM dd, yyyy')
                  : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 w-full">
          <div className="flex flex-col gap-3">
            <Label
              htmlFor="vendor"
              className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground flex items-baseline gap-1`}
            >
              Vendor <span className="text-destructive">*</span>
            </Label>
            <Select
              disabled={isLoading}
              value={formData.vendorId}
              onValueChange={(value) => {
                setFormData({ ...formData, vendorId: value });
                setErrors({ ...errors, vendorId: undefined });
              }}
            >
              <SelectTrigger
                id="vendor"
                className={`h-9 px-3 border-input bg-background shadow-sm rounded-lg ${errors.vendorId ? 'border-destructive' : ''} ${TYPOGRAPHY_CLASSNAMES.textSmRegular}`}
              >
                <SelectValue placeholder="Select a vendor" />
              </SelectTrigger>
              <SelectContent className={TYPOGRAPHY_CLASSNAMES.textSmRegular}>
                {vendors.length === 0 ? (
                  <div className="p-2 text-muted-foreground">
                    No vendors available
                  </div>
                ) : (
                  vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id.toString()}>
                      {vendor.companyName}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.vendorId && (
              <p
                className={`${TYPOGRAPHY_CLASSNAMES.textXsRegular} text-destructive mt-[-4px]`}
              >
                {errors.vendorId}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <Label
              htmlFor="rma-number"
              className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground flex items-baseline gap-1`}
            >
              RMA / Ticket Number: <span className="text-destructive">*</span>
            </Label>
            <Input
              id="rma-number"
              placeholder={RMA_PLACEHOLDER}
              value={formData.rmaNumber}
              onChange={(e) => {
                setFormData({ ...formData, rmaNumber: e.target.value });
                setErrors({ ...errors, rmaNumber: undefined });
              }}
              disabled={isLoading}
              className={`h-9 px-3 border-input bg-background shadow-sm rounded-lg ${errors.rmaNumber ? 'border-destructive' : ''} ${TYPOGRAPHY_CLASSNAMES.textSmRegular}`}
              maxLength={50}
            />
            {errors.rmaNumber && (
              <p
                className={`${TYPOGRAPHY_CLASSNAMES.textXsRegular} text-destructive mt-[-4px]`}
              >
                {errors.rmaNumber}
              </p>
            )}
          </div>

          <div className="flex items-start gap-5 w-full">
            <div className="flex flex-col gap-3 flex-1">
              <Label
                htmlFor="estimated-cost"
                className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}
              >
                Estimated Cost
              </Label>
              <div className="flex items-center shadow-sm rounded-lg border border-input bg-background w-full h-9 overflow-hidden">
                <Select defaultValue="LKR" disabled={isLoading}>
                  <SelectTrigger
                    className={`w-[70px] h-full ${TYPOGRAPHY_CLASSNAMES.textSmMedium} border-0 border-r border-input rounded-none bg-transparent focus:ring-0 focus:ring-offset-0`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LKR">Rs</SelectItem>
                    <SelectItem value="USD">$</SelectItem>
                    <SelectItem value="NOK">kr</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  id="estimated-cost"
                  type="number"
                  placeholder={ESTIMATED_COST_PLACEHOLDER}
                  step="0.01"
                  min="0"
                  value={formData.estimatedCost}
                  onChange={(e) => {
                    setFormData({ ...formData, estimatedCost: e.target.value });
                    setErrors({ ...errors, estimatedCost: undefined });
                  }}
                  disabled={isLoading}
                  className={`flex-1 h-full ${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground border-0 bg-transparent rounded-none focus-visible:ring-0 px-3 ${errors.estimatedCost ? 'bg-destructive/10' : ''}`}
                />
              </div>
              {errors.estimatedCost && (
                <p
                  className={`${TYPOGRAPHY_CLASSNAMES.textXsRegular} text-destructive mt-[-4px]`}
                >
                  {errors.estimatedCost}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3 flex-1">
              <Label
                htmlFor="return-date"
                className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}
              >
                Expected Return Date
              </Label>
              <div className="relative w-full shadow-sm rounded-lg h-9">
                <Input
                  id="return-date"
                  type="date"
                  value={formData.expectedReturnDate}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      expectedReturnDate: e.target.value,
                    });
                    setErrors({ ...errors, expectedReturnDate: undefined });
                  }}
                  disabled={isLoading}
                  className={`w-full h-full ${TYPOGRAPHY_CLASSNAMES.textSmRegular} pl-3 pr-10 border-input bg-background rounded-lg focus:border-ring focus:ring-1 focus:ring-ring ${errors.expectedReturnDate ? 'border-destructive' : ''}`}
                  min={new Date().toISOString().split('T')[0]}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                </div>
              </div>
              {errors.expectedReturnDate && (
                <p
                  className={`${TYPOGRAPHY_CLASSNAMES.textXsRegular} text-destructive mt-[-4px]`}
                >
                  {errors.expectedReturnDate}
                </p>
              )}
            </div>
          </div>
        </div>

        {submitError && (
          <div className="rounded-md bg-destructive/10 p-3 w-full">
            <p
              className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-destructive`}
            >
              {submitError}
            </p>
          </div>
        )}

        <DialogFooter className="flex items-center gap-2 sm:justify-end w-full mt-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="h-9 px-4 bg-secondary border border-border text-secondary-foreground hover:bg-secondary/80 shadow-sm rounded-lg"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || !isFormValid}
            className="h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm rounded-lg disabled:opacity-50"
          >
            {isLoading ? 'Dispatching...' : 'Confirm & Dispatch'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
