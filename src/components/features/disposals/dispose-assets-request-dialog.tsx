'use client';

import { useMemo, useState, useTransition } from 'react';
import { AlertCircle, MonitorX } from 'lucide-react';

import { createDisposalRequest } from '@/actions/disposals/create-request';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { tiqriToast } from '@/components/shared/sonner';

import type { SelectedAssetLite } from '@/types/disposals';

export function DisposeAssetsRequestDialog({
  open,
  onOpenChange,
  selectedAssets,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAssets: SelectedAssetLite[];
  onSubmitted: (result: { inserted: number; skipped: number }) => void;
}) {
  const [reason, setReason] = useState('');
  const [justification, setJustification] = useState('');
  const [isPending, startTransition] = useTransition();

  const assetIds = useMemo(() => selectedAssets.map((a) => a.id), [selectedAssets]);

  function reset() {
    setReason('');
    setJustification('');
  }

  const handleSubmit = () => {
    startTransition(async () => {
      try {
        const result = await createDisposalRequest({
          assetIds,
          reason,
          justification,
        });
        
        onOpenChange(false);
        onSubmitted({ inserted: result.inserted, skipped: result.skipped });
      } catch (error) {
        tiqriToast.error(error instanceof Error ? error.message : 'Failed to submit disposal requests.');
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="sm:max-w-140">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <MonitorX className="h-4 w-4 text-muted-foreground" />
            </div>
            <DialogTitle className="text-xl">Request Asset Disposal</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Initiate a disposal workflow for selected assets.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2 max-h-[60vh] overflow-y-auto pr-2">
          
          <div className="grid gap-2">
            <Label className="font-semibold text-foreground">
              Selected Assets{' '}
              <span className="font-normal text-muted-foreground">({selectedAssets.length})</span>
            </Label>

            <div className="max-h-40 overflow-y-auto rounded-md border border-border bg-background">
              {selectedAssets.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">No assets selected.</div>
              ) : (
                <ul className="divide-y divide-border">
                  {selectedAssets.map((asset) => (
                    <li key={asset.id} className="px-3 py-2 text-sm">
                      <div className="font-medium text-foreground">{asset.assetTag}</div>
                      <div className="text-muted-foreground">{asset.assetName}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p className="text-[0.8rem] text-muted-foreground">
              These assets will be flagged as <strong>Pending Disposal</strong> for Global Admin review.
            </p>
          </div>

          <div className="grid gap-2">
            <Label className="font-semibold text-foreground">
              Disposal Reason <span className="text-destructive">*</span>
            </Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="w-full bg-muted/50">
                <SelectValue placeholder="Select a standard reason..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Damaged beyond repair">Damaged beyond repair</SelectItem>
                <SelectItem value="End of life / Obsolete">End of life / Obsolete</SelectItem>
                <SelectItem value="Lost / Stolen">Lost / Stolen</SelectItem>
                <SelectItem value="Security compromise">Security compromise</SelectItem>
                <SelectItem value="Excess inventory">Excess inventory / Unused</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label className="font-semibold text-foreground">
              Justification <span className="font-normal text-muted-foreground">(Optional)</span>
            </Label>
            <Textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Provide additional context for the reviewing admin..."
              className="min-h-20 resize-none bg-muted/50"
            />
          </div>

          <div className="flex items-start gap-3 rounded-md border border-primary/20 bg-primary/10 p-3 text-sm text-primary">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>
              Submitting this request will flag the assets as <strong>Pending Disposal</strong>.
              A <strong>Global Admin</strong> must approve before final disposal is executed.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isPending || assetIds.length === 0 || !reason}
            className="w-full sm:w-auto"
            onClick={handleSubmit}
          >
            {isPending ? 'Submitting...' : 'Submit Request'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}