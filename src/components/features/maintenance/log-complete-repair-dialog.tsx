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
import type { CompleteRepairFormData } from '@/types/maintenance';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';

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
      setFormData({
        actualCost: '',
        resolutionNotes: '',
        updateStatusTo: 'Available',
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setFormData({
        actualCost: '',
        resolutionNotes: '',
        updateStatusTo: 'Available',
      });
      onClose();
    }
  };

  const isFormValid =
    formData.actualCost.trim() !== '' && formData.resolutionNotes.trim() !== '';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[500px] p-6 bg-background rounded-xl shadow-lg border border-border [&>button]:hidden">
        <div className="absolute right-4 top-4">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <DialogHeader className="pb-4">
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

        <div className="space-y-5">
          <div className="space-y-2">
            <Label
              className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}
            >
              Actual Final Cost: <span className="text-destructive">*</span>
            </Label>
            <div className="flex">
              <Select defaultValue="LKR" disabled={isLoading}>
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
          </div>

          <div className="space-y-2">
            <Label
              className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}
            >
              Resolution Notes <span className="text-destructive">*</span>
            </Label>
            <Textarea
              placeholder='e.g., "Replaced display cable"'
              value={formData.resolutionNotes}
              onChange={(e) =>
                setFormData({ ...formData, resolutionNotes: e.target.value })
              }
              disabled={isLoading}
              className={`min-h-[100px] resize-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring ${TYPOGRAPHY_CLASSNAMES.textSmRegular}`}
            />
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
