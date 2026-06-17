import { useMemo, useState, useEffect } from 'react';
import { CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface BulkTransferAsset {
  id: string;
  assetTag: string;
  name: string | null;
  location: string | null;
}

interface BulkTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAssets: BulkTransferAsset[];
  locationOptions: { id: number; name: string }[];
  onConfirm: (destinationLocationId: number) => Promise<void>;
  isMutating?: boolean;
}

export function BulkTransferDialog({
  open,
  onOpenChange,
  selectedAssets,
  locationOptions,
  onConfirm,
  isMutating = false,
}: BulkTransferDialogProps) {
  const [destinationLocationId, setDestinationLocationId] = useState<number | null>(null);
  const [transferDate, setTransferDate] = useState('');

  useEffect(() => {
    if (!open) {
      setDestinationLocationId(null);
      setTransferDate('');
    }
  }, [open]);

  const uniqueSelectedLocations = useMemo(() => {
    const merged = new Set<string>();
    for (const row of selectedAssets) {
      merged.add(row.location ?? '-');
    }
    return [...merged];
  }, [selectedAssets]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    if (!destinationLocationId) return;
    await onConfirm(destinationLocationId);
  };

  const toCellText = (value: string | null | undefined) => {
    if (!value || value.trim().length === 0) return '-';
    return value;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-90 rounded-xl border border-border bg-background p-0">
        <DialogTitle className="sr-only">Transfer assets</DialogTitle>
        <DialogDescription className="sr-only">
          Transfer selected assets to a destination location.
        </DialogDescription>

        <div className="border-b border-border px-4 py-3">
          <h3 className="text-2xl font-semibold text-foreground">
            Transfer {selectedAssets.length} Assets
          </h3>
        </div>

        <div className="space-y-3 px-4 py-3">
          <ScrollArea className="max-h-24 rounded-lg border border-border bg-muted p-2">
            <div className="space-y-1">
              {selectedAssets.map((selectedRow) => (
                <div
                  key={selectedRow.id}
                  className="grid grid-cols-[88px_1fr] gap-2 text-sm text-foreground"
                >
                  <span className="font-medium text-foreground">
                    {selectedRow.assetTag}
                  </span>
                  <span className="truncate">{toCellText(selectedRow.name)}</span>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Current Location</label>
            <Input
              value={
                uniqueSelectedLocations.length === 0
                  ? '-'
                  : uniqueSelectedLocations.length === 1
                    ? uniqueSelectedLocations[0]
                    : 'Multiple locations'
              }
              disabled
              className="h-9 rounded-lg border-border bg-muted"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">
              Destination Location
            </label>
            <select
              value={destinationLocationId ?? ''}
              onChange={(event) => {
                const parsedValue = Number(event.target.value);
                setDestinationLocationId(
                  Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null
                );
              }}
              className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground"
            >
              <option value="">Select destination</option>
              {locationOptions.map((locationOption) => (
                <option key={locationOption.id} value={locationOption.id}>
                  {locationOption.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Transfer Date</label>
            <div className="relative">
              <Input
                type="date"
                value={transferDate}
                onChange={(event) => setTransferDate(event.target.value)}
                className="h-9 rounded-lg border-border pr-9"
              />
              <CalendarDays className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-lg border-border px-3 text-sm"
            onClick={handleClose}
            disabled={isMutating}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 rounded-lg bg-primary px-3 text-sm text-primary-foreground hover:bg-primary/90"
            onClick={() => void handleConfirm()}
            disabled={!destinationLocationId || selectedAssets.length === 0 || isMutating}
          >
            Confirm Transfer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
