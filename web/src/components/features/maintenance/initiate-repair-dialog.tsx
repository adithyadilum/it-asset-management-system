'use client';

import { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Vendor, InitiateRepairFormData } from '@/types/maintenance';

interface InitiateRepairDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: InitiateRepairFormData) => Promise<void>;
  vendors: Vendor[];
  isLoading?: boolean;
}

const RMA_PLACEHOLDER = 'e.g., RMA-2026-0001';
const ESTIMATED_COST_PLACEHOLDER = 'e.g., 250.00';

/**
 * Initiate Repair Dialog Component
 * Modal to dispatch asset for vendor repair
 * US-15.3 Implementation
 */
export function InitiateRepairDialog({
  isOpen,
  onClose,
  onConfirm,
  vendors,
  isLoading = false,
}: InitiateRepairDialogProps) {
  const [formData, setFormData] = useState<InitiateRepairFormData>({
    vendorId: '',
    rmaNumber: '',
    estimatedCost: '',
    expectedReturnDate: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof InitiateRepairFormData, string>>>({});

  // Validate form
  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!formData.vendorId.trim()) {
      newErrors.vendorId = 'Vendor is required';
    }

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
        newErrors.expectedReturnDate = 'Expected Return Date must be in the future';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await onConfirm(formData);
      setFormData({ vendorId: '', rmaNumber: '', estimatedCost: '', expectedReturnDate: '' });
      setErrors({});
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initiate repair';
      setErrors({ vendorId: errorMessage });
    }
  };

  const handleClose = () => {
    setFormData({ vendorId: '', rmaNumber: '', estimatedCost: '', expectedReturnDate: '' });
    setErrors({});
    onClose();
  };

  // Check if form is valid for button enable/disable
  const isFormValid = formData.vendorId.trim() !== '' && formData.rmaNumber.trim() !== '';

  // Get selected vendor for display
  const selectedVendor = vendors.find((v) => v.id.toString() === formData.vendorId);

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Send Asset for Repair</AlertDialogTitle>
          <AlertDialogDescription>
            Dispatch this asset to a vendor for repair. The asset status will be updated to &quot;In Repair&quot;.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
          {/* Vendor Dropdown */}
          <div className="space-y-2">
            <Label htmlFor="vendor" className="text-sm font-medium">
              Vendor <span className="text-red-500">*</span>
            </Label>
            <Select 
              value={formData.vendorId} 
              onValueChange={(value) => {
                setFormData({ ...formData, vendorId: value });
                setErrors({ ...errors, vendorId: undefined });
              }}
            >
              <SelectTrigger id="vendor" className={errors.vendorId ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select a vendor..." />
              </SelectTrigger>
              <SelectContent>
                {vendors.length === 0 ? (
                  <div className="p-2 text-sm text-slate-500">No vendors available</div>
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
              <p className="text-sm text-red-500">{errors.vendorId}</p>
            )}
            {selectedVendor?.email && (
              <p className="text-xs text-slate-500">Email: {selectedVendor.email}</p>
            )}
            {selectedVendor?.phone && (
              <p className="text-xs text-slate-500">Phone: {selectedVendor.phone}</p>
            )}
          </div>

          {/* RMA Number Input */}
          <div className="space-y-2">
            <Label htmlFor="rma-number" className="text-sm font-medium">
              RMA/Ticket Number <span className="text-red-500">*</span>
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
              className={errors.rmaNumber ? 'border-red-500' : ''}
              maxLength={50}
            />
            {errors.rmaNumber && (
              <p className="text-sm text-red-500">{errors.rmaNumber}</p>
            )}
            <p className="text-xs text-slate-500">
              {formData.rmaNumber.length}/50 characters
            </p>
          </div>

          {/* Estimated Cost Input */}
          <div className="space-y-2">
            <Label htmlFor="estimated-cost" className="text-sm font-medium">
              Estimated Cost
            </Label>
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
              className={errors.estimatedCost ? 'border-red-500' : ''}
            />
            {errors.estimatedCost && (
              <p className="text-sm text-red-500">{errors.estimatedCost}</p>
            )}
            <p className="text-xs text-slate-500">Optional: Expected repair cost in USD</p>
          </div>

          {/* Expected Return Date Picker */}
          <div className="space-y-2">
            <Label htmlFor="return-date" className="text-sm font-medium">
              Expected Return Date
            </Label>
            <Input
              id="return-date"
              type="date"
              value={formData.expectedReturnDate}
              onChange={(e) => {
                setFormData({ ...formData, expectedReturnDate: e.target.value });
                setErrors({ ...errors, expectedReturnDate: undefined });
              }}
              disabled={isLoading}
              className={errors.expectedReturnDate ? 'border-red-500' : ''}
              min={new Date().toISOString().split('T')[0]}
            />
            {errors.expectedReturnDate && (
              <p className="text-sm text-red-500">{errors.expectedReturnDate}</p>
            )}
            <p className="text-xs text-slate-500">Optional: When you expect the asset back</p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading || !isFormValid}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? 'Dispatching...' : 'Confirm & Dispatch'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}