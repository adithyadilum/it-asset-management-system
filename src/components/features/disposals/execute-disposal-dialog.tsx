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
  AlertTriangle,
  CheckCircle2,
  X,
} from 'lucide-react';

import { executeAssetDisposal } from '@/actions/disposals/execute';
import { uploadDisposalReceipt } from '@/actions/disposals/upload-receipt';
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

import type { PendingDisposalRow } from '@/types/disposals';

interface ExecuteDisposalDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAssets: PendingDisposalRow[]; 
  onSuccess: () => void;
  singleCategory?: string; 
}

function getDeviceIcon(category: string, className?: string) {
  const lowerCat = category.toLowerCase();
  if (lowerCat.includes('laptop') || lowerCat.includes('macbook')) return <Laptop className={className} />;
  if (lowerCat.includes('phone') || lowerCat.includes('mobile') || lowerCat.includes('tablet')) return <Smartphone className={className} />;
  if (lowerCat.includes('server') || lowerCat.includes('network')) return <Server className={className} />;
  if (lowerCat.includes('keyboard') || lowerCat.includes('mouse') || lowerCat.includes('peripheral')) return <Keyboard className={className} />;
  if (lowerCat.includes('monitor') || lowerCat.includes('display') || lowerCat.includes('desktop')) return <Monitor className={className} />;
  return <Package className={className} />;
}

export function ExecuteDisposalDialog({
  isOpen,
  onOpenChange,
  selectedAssets,
  onSuccess,
  singleCategory = '',
}: ExecuteDisposalDialogProps) {
  const [reason, setReason] = useState('');
  const [method, setMethod] = useState<'Sold' | 'Stolen' | 'E-waste' | 'Donated' | ''>('');
  const [salvageValue, setSalvageValue] = useState('');
  const [dataWiped, setDataWiped] = useState(false);
  const [tagsRemoved, setTagsRemoved] = useState(false);
  
  const [receiptUrls, setReceiptUrls] = useState<string[]>([]);
  
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const isBulk = selectedAssets.length > 1;
  const singleAsset = selectedAssets[0];

  const expectedConfirmText = isBulk 
    ? `DISPOSE ${selectedAssets.length} ASSETS` 
    : (singleAsset?.assetTag || '');

  const isFormValid =
    selectedAssets.length > 0 &&
    reason !== '' &&
    method !== '' &&
    dataWiped &&
    tagsRemoved &&
    confirmText.trim() === expectedConfirmText.trim();

  const handleRemoveReceipt = (indexToRemove: number) => {
    setReceiptUrls((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleExecute = () => {
    if (!isFormValid) return;
    setError(null);

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set('disposalIds', JSON.stringify(selectedAssets.map((a) => a.id)));
        formData.set('assetIds', JSON.stringify(selectedAssets.map((a) => a.assetId)));
        formData.set('reason', reason);
        formData.set('disposalMethod', method);
        formData.set('actualSalvageValue', salvageValue);
        formData.set('dataWiped', String(dataWiped));
        formData.set('tagsRemoved', String(tagsRemoved));
        formData.set('receiptUrls', JSON.stringify(receiptUrls));

        const result = await executeAssetDisposal({ success: false, message: '' }, formData);

        if (result.success) {
          tiqriToast.success(
            isBulk 
              ? `Successfully disposed ${selectedAssets.length} assets.` 
              : 'Asset successfully disposed.'
          );
          onSuccess();
          handleOpenChange(false);
        } else {
          setError(result.message);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to execute disposal.');
      }
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setReason('');
      setMethod('');
      setSalvageValue('');
      setDataWiped(false);
      setTagsRemoved(false);
      setReceiptUrls([]);
      setConfirmText('');
      setError(null);
    }
    onOpenChange(open);
  };

  if (!singleAsset && isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-lg overflow-hidden bg-background">
        
        <div className="p-6 pb-4">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              {isBulk ? <AlertTriangle className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
              <DialogTitle className="text-xl font-semibold">
                {isBulk ? `Dispose ${selectedAssets.length} Assets` : 'Dispose Asset'}
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
          <div className="flex flex-col gap-6 pb-6 pt-2">
            
            {isBulk ? (
              <div className="flex flex-col rounded-lg border border-border/50 bg-muted/40 p-4 shadow-sm">
                <div className="max-h-48 overflow-y-auto flex flex-col gap-3">
                  {selectedAssets.map((row) => (
                    <div
                      key={row.id}
                      className="grid grid-cols-[120px_1fr] gap-4 border-b border-border/50 pb-3 last:border-0 last:pb-0 text-[14px] text-foreground"
                    >
                      <span className="font-medium text-muted-foreground">{row.assetTag}</span>
                      <span className="truncate font-medium">{row.assetName || 'Unknown Device'}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col rounded-lg border border-border bg-muted/30 p-5 shadow-sm">
                <div className="flex items-center gap-3 border-b border-border pb-4">
                  {getDeviceIcon(singleCategory, 'h-8 w-8 shrink-0 text-muted-foreground')}
                  <h3 className="text-lg font-semibold text-foreground">
                    {singleAsset?.assetName || 'Unknown Device'}
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-y-3 pt-4 text-sm">
                  <div className="font-medium text-muted-foreground">Asset ID:</div>
                  <div className="font-medium text-foreground">{singleAsset?.assetTag}</div>

                  <div className="font-medium text-muted-foreground">Flagged By:</div>
                  <div className="font-medium text-foreground">{singleAsset?.flaggedBy}</div>

                  <div className="font-medium text-muted-foreground">Flagged Date:</div>
                  <div className="font-medium text-foreground">
                    {singleAsset?.requestedAt ? new Date(singleAsset.requestedAt).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-4 w-full">
              <div className="flex flex-col gap-1.5 w-full">
                <Label className="text-sm font-medium text-foreground">
                  Reason for Disposal <span className="text-destructive">*</span>
                </Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger className="w-full h-10 border-input bg-background shadow-sm">
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Defective">Defective / Broken</SelectItem>
                    <SelectItem value="Obsolete">Obsolete</SelectItem>
                    <SelectItem value="Lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5 w-full">
                <Label className="text-sm font-medium text-foreground">
                  Disposal Method <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={method}
                  onValueChange={(val: string) => setMethod(val as 'Sold' | 'Stolen' | 'E-waste' | 'Donated' | '')}
                >
                  <SelectTrigger className="w-full h-10 border-input bg-background shadow-sm">
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

              <div className="flex flex-col gap-1.5 w-full">
                <Label className="text-sm font-medium text-foreground">
                  Actual Salvage Value ($) <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={salvageValue}
                  onChange={(e) => setSalvageValue(e.target.value)}
                  className="h-10 border-input bg-background shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="data-wipe"
                  checked={dataWiped}
                  onCheckedChange={(checked) => setDataWiped(checked as boolean)}
                  className="mt-0.5 border-primary data-[state=checked]:bg-primary"
                />
                <Label htmlFor="data-wipe" className="cursor-pointer text-sm font-medium text-foreground">
                  Data wiped and factory reset confirmed. <span className="text-destructive">*</span>
                </Label>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="tags-removed"
                  checked={tagsRemoved}
                  onCheckedChange={(checked) => setTagsRemoved(checked as boolean)}
                  className="mt-0.5 border-primary data-[state=checked]:bg-primary"
                />
                <Label htmlFor="tags-removed" className="cursor-pointer text-sm font-medium text-foreground">
                  All physical TIQRI asset tags removed. <span className="text-destructive">*</span>
                </Label>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Label className="text-sm font-medium text-foreground">
                {isBulk ? "Upload Certificates or Receipts" : "Upload E-Waste Certificate or Receipt"} <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
              </Label>
              
              <FileUploadZone
                key={`upload-zone-${receiptUrls.length}`} 
                onUploadSuccess={(url: string) => setReceiptUrls((prev) => [...prev, url])}
                onUploadError={(msg: string) => setError(msg)}
                uploadAction={uploadDisposalReceipt}
                label="Click or drag to upload files"
                subLabel="Supports .PDF, .JPG, .PNG up to 4.5MB. You can upload multiple."
              />
              
            {receiptUrls.length > 0 && (
              <div className="rounded-md bg-muted/40 p-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Attached Files ({receiptUrls.length})
                </span>
                <div className="flex flex-col gap-2">
                  {receiptUrls.map((url, idx) => {
                    const fileName = url.split('/').pop() || `File ${idx + 1}`;
                    return (
                      <div key={idx} className="flex items-start justify-between gap-2 text-sm text-foreground bg-background border border-border/50 p-2 rounded-md">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                          <span className="break-all">{fileName}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => handleRemoveReceipt(idx)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            </div>

            <div className="mt-2 flex flex-col gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-4">
              <label className="text-sm font-medium leading-relaxed text-foreground">
                To confirm {isBulk ? 'these disposals' : 'this disposal'}, please type{' '}
                <strong className="whitespace-nowrap font-bold text-destructive">
                  {expectedConfirmText}
                </strong>{' '}
                below:
              </label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                placeholder={expectedConfirmText}
                className="h-10 border-destructive/30 bg-background uppercase"
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
            {isPending ? 'Processing...' : (isBulk ? 'Execute Bulk Disposal' : 'Execute Disposal')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}