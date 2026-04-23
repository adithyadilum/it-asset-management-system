'use client';

import { useMemo, useState, useTransition } from 'react';
import { AlertCircle, MonitorX } from 'lucide-react';

import { createBulkDisposalRequests } from '@/actions/disposals';
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

export type SelectedAssetLite = {
  id: string;        // assets.id (uuid)
  assetTag: string;  // AST-###
  assetName: string; // Device name
};

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
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const assetIds = useMemo(() => selectedAssets.map((a) => a.id), [selectedAssets]);

  function reset() {
    setReason('');
    setJustification('');
    setError(null);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="sm:max-w-[560px]">
        {/* HEADER: Remains fixed at the top */}
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
              <MonitorX className="h-4 w-4 text-slate-600" />
            </div>
            <DialogTitle className="text-xl">Request Asset Disposal</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Initiate a disposal workflow for selected assets.
          </DialogDescription>
        </DialogHeader>

        {/* BODY: Scrollable container added here (max-h-[60vh] and overflow-y-auto) */}
        <div className="grid gap-5 py-2 max-h-[60vh] overflow-y-auto pr-2">
          
          {/* Selected Assets */}
          <div className="grid gap-2">
            <Label className="font-semibold text-slate-700">
              Selected Assets{' '}
              <span className="font-normal text-slate-500">({selectedAssets.length})</span>
            </Label>

            <div className="max-h-[160px] overflow-y-auto rounded-md border border-slate-200 bg-white">
              {selectedAssets.length === 0 ? (
                <div className="p-3 text-sm text-slate-600">No assets selected.</div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {selectedAssets.map((asset) => (
                    <li key={asset.id} className="px-3 py-2 text-sm">
                      <div className="font-medium text-slate-900">{asset.assetTag}</div>
                      <div className="text-slate-600">{asset.assetName}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p className="text-[0.8rem] text-slate-500">
              These assets will be flagged as <strong>Pending Disposal</strong> for Global Admin review.
            </p>
          </div>

          {/* Reason */}
          <div className="grid gap-2">
            <Label className="font-semibold text-slate-700">
              Disposal Reason <span className="text-red-500">*</span>
            </Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="bg-slate-50/50">
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

          {/* Justification */}
          <div className="grid gap-2">
            <Label className="font-semibold text-slate-700">
              Justification <span className="font-normal text-slate-500">(Optional)</span>
            </Label>
            <Textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Provide additional context for the reviewing admin..."
              className="min-h-[80px] resize-none bg-slate-50/50"
            />
          </div>

         
          <div className="flex items-start gap-3 rounded-md bg-blue-50 p-3 text-sm text-blue-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
            <p>
              Submitting this request will flag the assets as <strong>Pending Disposal</strong>.
              A <strong>Global Admin</strong> must approve before final disposal is executed.
            </p>
          </div>

         
          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </div>

       
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
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
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800"
            onClick={() => {
              setError(null);
              startTransition(async () => {
                try {
                  const result = await createBulkDisposalRequests({
                    assetIds,
                    reason,
                    justification,
                  });
                  onSubmitted({ inserted: result.inserted, skipped: result.skipped });
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Failed to submit requests.');
                }
              });
            }}
          >
            {isPending ? 'Submitting...' : 'Submit Request'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}