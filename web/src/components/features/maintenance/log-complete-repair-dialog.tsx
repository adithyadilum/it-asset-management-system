'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { CheckSquare, X } from 'lucide-react';
import type { CompleteRepairFormData } from '@/types/maintenance';

interface LogCompleteRepairDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: CompleteRepairFormData) => Promise<void>;
  isLoading?: boolean;
}

export function LogCompleteRepairDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: LogCompleteRepairDialogProps) {
  const [formData, setFormData] = useState<CompleteRepairFormData>({
    actualCost: '',
    resolutionNotes: '',
    updateStatusTo: 'Available',
  });

  const handleConfirm = async () => {
    try {
      await onConfirm(formData);
      setFormData({ actualCost: '', resolutionNotes: '', updateStatusTo: 'Available' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setFormData({ actualCost: '', resolutionNotes: '', updateStatusTo: 'Available' });
      onClose();
    }
  };

  const isFormValid = formData.actualCost.trim() !== '' && formData.resolutionNotes.trim() !== '';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      {/* [&>button]:hidden hides the default Shadcn close button so we can use our custom one */}
      <DialogContent className="max-w-[500px] p-6 bg-white rounded-xl shadow-lg border-0 [&>button]:hidden">
        
        {/* Custom Close Button */}
        <div className="absolute right-4 top-4">
          <button onClick={handleClose} disabled={isLoading} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-slate-900">
            <CheckSquare className="h-6 w-6 text-slate-700" strokeWidth={1.5} />
            Log Completed Repair
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Actual Final Cost Input Group */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-900">
              Actual Final Cost: <span className="text-red-500">*</span>
            </Label>
            <div className="flex">
              <Select defaultValue="USD">
                <SelectTrigger className="w-[70px] rounded-r-none border-r-0 focus:ring-0 focus:border-slate-200 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">$</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="10.00"
                step="0.01"
                min="0"
                value={formData.actualCost}
                onChange={(e) => setFormData({ ...formData, actualCost: e.target.value })}
                disabled={isLoading}
                className="flex-1 rounded-l-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-blue-500"
              />
            </div>
          </div>

          {/* Resolution Notes */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-900">
              Resolution Notes <span className="text-red-500">*</span>
            </Label>
            <Textarea
              placeholder='e.g., "Replaced display cable"'
              value={formData.resolutionNotes}
              onChange={(e) => setFormData({ ...formData, resolutionNotes: e.target.value })}
              disabled={isLoading}
              className="min-h-[100px] resize-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-blue-500"
            />
          </div>

          {/* Update Status Dropdown */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-900">
              Update Status To <span className="text-red-500">*</span>
            </Label>
            <Select 
              value={formData.updateStatusTo}
              onValueChange={(value) => setFormData({ ...formData, updateStatusTo: value as 'Available' | 'Disposed' })}
            >
              <SelectTrigger className="w-full focus:ring-1 focus:ring-blue-500 bg-white">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Available">Available</SelectItem>
                <SelectItem value="Disposed">Disposed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="pt-6 sm:justify-end gap-3">
          <Button variant="outline" onClick={handleClose} disabled={isLoading} className="border-slate-200 text-slate-700 hover:bg-slate-50 min-w-[100px]">
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading || !isFormValid} className="bg-[#040d5a] hover:bg-[#040d5a]/90 text-white min-w-[100px]">
            {isLoading ? 'Saving...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}