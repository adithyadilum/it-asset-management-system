'use client';

import { useState, useTransition } from 'react';
import {
  Monitor,
  AlertCircle,
  Laptop,
  Smartphone,
  Server,
  Keyboard,
  Package,
} from 'lucide-react';

import { executeAssetDisposal, uploadDisposalReceipt } from '@/actions/disposals';
import { FileUploadZone } from '@/components/shared/file-upload-zone';
import { tiqriToast } from '@/components/shared/sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ExecuteDisposalDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  disposalId: number;
  assetId: string;
  assetTag: string;
  assetName?: string;
  flaggedBy?: string;
  category?: string;
  requestedAt?: string;
  onSuccess: () => void;
}

function getDeviceIcon(category: string, className?: string) {
  const lowerCat = category.toLowerCase();

  if (lowerCat.includes('laptop') || lowerCat.includes('macbook')) {
    return <Laptop className={className} />;
  }

  if (
    lowerCat.includes('phone') ||
    lowerCat.includes('mobile') ||
    lowerCat.includes('tablet')
  ) {
    return <Smartphone className={className} />;
  }

  if (lowerCat.includes('server') || lowerCat.includes('network')) {
    return <Server className={className} />;
  }

  if (
    lowerCat.includes('keyboard') ||
    lowerCat.includes('mouse') ||
    lowerCat.includes('peripheral')
  ) {
    return <Keyboard className={className} />;
  }

  if (
    lowerCat.includes('monitor') ||
    lowerCat.includes('display') ||
    lowerCat.includes('desktop')
  ) {
    return <Monitor className={className} />;
  }

  return <Package className={className} />;
}

export function ExecuteDisposalDialog({
  isOpen,
  onOpenChange,
  disposalId,
  assetId,
  assetTag,
  assetName = 'Unknown Device',
  flaggedBy = 'Admin',
  category = '',
  requestedAt,
  onSuccess,
}: ExecuteDisposalDialogProps) {
  const [reason, setReason] = useState('');
  const [method, setMethod] = useState<
    'Sold' | 'Stolen' | 'E-waste' | 'Donated' | ''
  >('');
  const [dataWiped, setDataWiped] = useState(false);
  const [tagsRemoved, setTagsRemoved] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const isFormValid =
    reason !== '' &&
    method !== '' &&
    dataWiped &&
    tagsRemoved &&
    receiptUrl !== '' &&
    confirmText.trim().toLowerCase() === assetTag.trim().toLowerCase();

  const handleExecute = () => {
    if (!isFormValid) return;
    setError(null);

    startTransition(async () => {
      try {
        await executeAssetDisposal({
          disposalId,
          assetId,
          disposalMethod: method as 'Sold' | 'Stolen' | 'E-waste' | 'Donated',
          dataWiped,
          tagsRemoved,
          receiptUrl,
        });

        tiqriToast.success('Asset successfully disposed.');
        onSuccess();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to execute disposal.'
        );
      }
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setReason('');
      setMethod('');
      setDataWiped(false);
      setTagsRemoved(false);
      setReceiptUrl('');
      setConfirmText('');
      setError(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-lg overflow-hidden bg-background">
        <div className="p-6 pb-4">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-6 w-6" />
              <DialogTitle className="text-xl font-semibold">
                Dispose Asset
              </DialogTitle>
            </div>
            <DialogDescription className="mt-2 text-sm font-medium text-muted-foreground">
              This action will permanently change the asset status to{' '}
              <span className="font-bold text-foreground">Disposed</span> and
              remove it from active financial tracking.
            </DialogDescription>
          </DialogHeader>
        </div>

        <ScrollArea className="flex-1 overflow-y-auto px-6">
          <div className="flex flex-col gap-6 pb-6">
            {/* Dynamic Asset Details Card */}
            <div className="flex flex-col rounded-lg border border-border bg-muted/30 p-5 shadow-sm">
              <div className="flex items-center gap-3 border-b border-border pb-4">
                {getDeviceIcon(
                  category,
                  'h-8 w-8 shrink-0 text-muted-foreground'
                )}
                <h3 className="text-lg font-semibold text-foreground">
                  {assetName}
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-y-3 pt-4 text-sm">
                <div className="font-medium text-muted-foreground">
                  Asset ID:
                </div>
                <div className="whitespace-nowrap font-medium text-foreground">
                  {assetTag}
                </div>

                <div className="font-medium text-muted-foreground">
                  Flagged By:
                </div>
                <div className="font-medium text-foreground">{flaggedBy}</div>

                <div className="font-medium text-muted-foreground">
                  Flagged Date:
                </div>
                <div className="font-medium text-foreground">
                  {requestedAt
                    ? new Date(requestedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'N/A'}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-medium text-foreground">
                  Reason for Disposal{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger className="h-10 border-input bg-background shadow-sm">
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Defective">
                      Defective / Broken
                    </SelectItem>
                    <SelectItem value="Obsolete">Obsolete</SelectItem>
                    <SelectItem value="Lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-medium text-foreground">
                  Disposal Method <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={method}
                  onValueChange={(val: string) =>
                    setMethod(
                      val as 'Sold' | 'Stolen' | 'E-waste' | 'Donated' | ''
                    )
                  }
                >
                  <SelectTrigger className="h-10 border-input bg-background shadow-sm">
                    <SelectValue placeholder="Select a method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="E-waste">E-waste Recycling</SelectItem>
                    <SelectItem value="Sold">Sold / Auctioned</SelectItem>
                    <SelectItem value="Donated">Donated</SelectItem>
                    <SelectItem value="Stolen">Stolen / Written Off</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="data-wipe"
                  checked={dataWiped}
                  onCheckedChange={(checked) =>
                    setDataWiped(checked as boolean)
                  }
                  className="mt-0.5 border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                />
                <Label
                  htmlFor="data-wipe"
                  className="cursor-pointer text-sm font-medium text-foreground"
                >
                  Data wiped and factory reset confirmed.
                </Label>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="tags-removed"
                  checked={tagsRemoved}
                  onCheckedChange={(checked) =>
                    setTagsRemoved(checked as boolean)
                  }
                  className="mt-0.5 border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                />
                <Label
                  htmlFor="tags-removed"
                  className="cursor-pointer text-sm font-medium text-foreground"
                >
                  All physical TIQRI asset tags removed.
                </Label>
              </div>
            </div>

            <FileUploadZone
              onUploadSuccess={(url: string) => setReceiptUrl(url)}
              onUploadError={(msg: string) => setError(msg)}
              uploadAction={uploadDisposalReceipt}
              label="Upload E-Waste Certificate or Receipt"
              subLabel="Supports .PDF, .JPG, .PNG up to 5MB"
            />

            <div className="mt-2 flex flex-col gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-4">
              <label className="text-sm font-medium leading-relaxed text-foreground">
                To confirm this disposal, please type the Asset ID ({' '}
                <span className="whitespace-nowrap font-bold text-destructive">
                  {assetTag}
                </span>{' '}
                ) below:
              </label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={assetTag}
                className="h-10 border-destructive/30 bg-background"
              />
            </div>

            {error && (
              <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-end gap-3 border-t border-border bg-background p-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
            className="h-10 px-6 font-medium"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!isFormValid || isPending}
            onClick={handleExecute}
            className="h-10 px-6 font-semibold shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {isPending ? 'Processing...' : 'Confirm Disposal'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
