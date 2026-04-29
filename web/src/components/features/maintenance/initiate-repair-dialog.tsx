'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { AlertCircle, X, Laptop, CalendarDays } from 'lucide-react';
import type { Vendor, InitiateRepairFormData } from '@/types/maintenance';
import { format } from 'date-fns';

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
  const [errors, setErrors] = useState<Partial<Record<keyof InitiateRepairFormData, string>>>({});

  const validateForm = () => {
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
        newErrors.expectedReturnDate = 'Expected Return Date must be in the future';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = async () => {
    if (!validateForm()) return;
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
    if (!isLoading) {
      setFormData({ vendorId: '', rmaNumber: '', estimatedCost: '', expectedReturnDate: '' });
      setErrors({});
      onClose();
    }
  };

  const isFormValid = formData.vendorId.trim() !== '' && formData.rmaNumber.trim() !== '';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      {/* Dialog strictly set to 600px width with 24px (p-6) padding */}
      <DialogContent className="sm:max-w-[600px] w-full p-6 bg-white rounded-xl shadow-lg border border-slate-200 [&>button]:hidden flex flex-col gap-6">
        
        {/* ============ HEADER SECTION ============ */}
        <div className="flex items-center justify-between">
          <DialogTitle className="flex items-center gap-2 text-[20px] font-semibold text-[#0f172a] leading-7">
            <AlertCircle className="h-[28px] w-[28px] opacity-70" strokeWidth={1.5} />
            Send Asset for Repair
          </DialogTitle>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-[#0f172a] opacity-70 hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
          >
            {/* Swapped Ban for X */}
            <X className="h-[20px] w-[20px]" strokeWidth={2} />
          </button>
        </div>

        {/* ============ ASSET DETAILS CARD ============ */}
        <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg py-6 flex flex-col items-center gap-6 shadow-[0px_1px_3px_rgba(0,0,0,0.1)] w-full">
          
          {/* Icon & Name */}
          <div className="flex items-center justify-center gap-[10px] w-full px-6">
            <Laptop className="h-[48px] w-[48px] text-[#0f172a] shrink-0" strokeWidth={1} />
            <span className="font-semibold text-[18px] leading-[28px] text-[#0f172a] truncate">
              {assetName || 'Unknown Asset'}
            </span>
          </div>

          {/* Precise 2-Column Grid matching Figma CSS */}
          <div className="w-full flex justify-center px-6">
            <div className="grid grid-cols-[120px_1fr] gap-x-8 gap-y-[10px] text-[14px] text-[#0f172a] w-fit min-w-[280px]">
              <div className="font-medium">Asset ID:</div>
              <div className="font-medium truncate">{assetId || 'N/A'}</div>
              
              <div className="font-medium">Serial</div>
              <div className="font-medium truncate">{assetSerial || 'N/A'}</div>
              
              <div className="font-medium">Reported By:</div>
              <div className="font-medium truncate">{reportedBy || 'N/A'}</div>
              
              <div className="font-medium">Date:</div>
              <div className="font-medium truncate">
                {reportedDate ? format(new Date(reportedDate), 'MMM dd, yyyy') : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* ============ FORM SECTION ============ */}
        <div className="flex flex-col gap-6 w-full">
          
          {/* Vendor */}
          <div className="flex flex-col gap-3">
            <Label htmlFor="vendor" className="text-[14px] font-medium text-[#0f172a] flex items-baseline gap-1">
              Vendor <span className="text-[#ef4444]">*</span>
            </Label>
            <Select 
              value={formData.vendorId} 
              onValueChange={(value) => {
                setFormData({ ...formData, vendorId: value });
                setErrors({ ...errors, vendorId: undefined });
              }}
            >
              {/* 36px height to match Figma input styling */}
              <SelectTrigger id="vendor" className={`h-[36px] text-[14px] px-3 border-[#e2e8f0] bg-white shadow-[0px_1px_2px_rgba(0,0,0,0.1)] rounded-lg ${errors.vendorId ? 'border-red-500' : ''}`}>
                <SelectValue placeholder="Select a vendor" />
              </SelectTrigger>
              <SelectContent className="text-[14px]">
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
            {errors.vendorId && <p className="text-sm text-red-500 mt-[-4px]">{errors.vendorId}</p>}
          </div>

          {/* RMA Number */}
          <div className="flex flex-col gap-3">
            <Label htmlFor="rma-number" className="text-[14px] font-medium text-[#0f172a] flex items-baseline gap-1">
              RMA / Ticket Number: <span className="text-[#ef4444]">*</span>
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
              className={`h-[36px] text-[14px] px-3 border-[#e2e8f0] bg-white shadow-[0px_1px_2px_rgba(0,0,0,0.1)] rounded-lg ${errors.rmaNumber ? 'border-red-500' : ''}`}
              maxLength={50}
            />
            {errors.rmaNumber && <p className="text-sm text-red-500 mt-[-4px]">{errors.rmaNumber}</p>}
          </div>

          {/* Estimated Cost & Return Date */}
          <div className="flex items-start gap-5 w-full">
            
            {/* Estimated Cost */}
            <div className="flex flex-col gap-3 flex-1">
              <Label htmlFor="estimated-cost" className="text-[14px] font-medium text-[#0f172a]">
                Estimated Cost
              </Label>
              <div className="flex items-center shadow-[0px_1px_2px_rgba(0,0,0,0.1)] rounded-lg border border-[#e2e8f0] bg-white w-full h-[36px] overflow-hidden">
                <Select defaultValue="USD">
                  <SelectTrigger className="w-[60px] h-full text-[14px] font-medium border-0 border-r border-[#e2e8f0] rounded-none bg-transparent focus:ring-0 focus:ring-offset-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">$</SelectItem>
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
                  className={`flex-1 h-full text-[14px] font-medium text-slate-500 border-0 bg-transparent rounded-none focus-visible:ring-0 px-3 ${errors.estimatedCost ? 'bg-red-50' : ''}`}
                />
              </div>
              {errors.estimatedCost && <p className="text-sm text-red-500 mt-[-4px]">{errors.estimatedCost}</p>}
            </div>

            {/* Expected Return Date */}
            <div className="flex flex-col gap-3 flex-1">
              <Label htmlFor="return-date" className="text-[14px] font-medium text-[#0f172a]">
                Expected Return Date
              </Label>
              <div className="relative w-full shadow-[0px_1px_2px_rgba(0,0,0,0.1)] rounded-lg h-[36px]">
                <Input
                  id="return-date"
                  type="date"
                  value={formData.expectedReturnDate}
                  onChange={(e) => {
                    setFormData({ ...formData, expectedReturnDate: e.target.value });
                    setErrors({ ...errors, expectedReturnDate: undefined });
                  }}
                  disabled={isLoading}
                  className={`w-full h-full text-[14px] pl-3 pr-10 border-[#e2e8f0] bg-white rounded-lg focus:border-slate-300 focus:ring-1 focus:ring-slate-300 ${errors.expectedReturnDate ? 'border-red-500' : ''}`}
                  min={new Date().toISOString().split('T')[0]}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500">
                  <CalendarDays className="h-[16px] w-[16px]" />
                </div>
              </div>
              {errors.expectedReturnDate && <p className="text-sm text-red-500 mt-[-4px]">{errors.expectedReturnDate}</p>}
            </div>
          </div>
        </div>

        {/* ============ FOOTER SECTION ============ */}
        <DialogFooter className="flex items-center gap-2 sm:justify-end w-full">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="h-[36px] px-4 bg-[#f1f5f9] border border-[#e2e8f0] text-[#0f172a] hover:bg-slate-200 shadow-[0px_1px_2px_rgba(0,0,0,0.1)] rounded-lg"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || !isFormValid}
            className="h-[36px] px-4 bg-[#040d5a] text-white hover:bg-[#040d5a]/90 shadow-[0px_1px_2px_rgba(0,0,0,0.1)] rounded-lg disabled:opacity-50"
          >
            {isLoading ? 'Dispatching...' : 'Confirm & Dispatch'}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}