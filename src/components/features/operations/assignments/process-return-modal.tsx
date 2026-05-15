"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { tiqriToast } from "@/components/shared/sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type ReturnAssetItem = {
  assetId: string;
  assetTag: string;
  assetName: string;
  assignee: string;
  assignmentId?: number;
};

interface ProcessReturnModalProps {
  isOpen: boolean;
  asset: ReturnAssetItem | null;
  onOpenChange: (open: boolean) => void;
}

export function ProcessReturnModal({
  isOpen,
  asset,
  onOpenChange,
}: ProcessReturnModalProps) {
  const router = useRouter();
  const [condition, setCondition] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        setCondition("");
        setNotes("");
      }
      onOpenChange(open);
    },
    [onOpenChange]
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!asset) {
      return;
    }

    if (!condition) {
      tiqriToast.warning("Please select a condition.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Stub for actual return processing
      tiqriToast.success("Asset returned successfully.");
      handleOpenChange(false);
      router.refresh();
    } catch {
      tiqriToast.error("Failed to process return.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Process Return: {asset?.assetName ?? asset?.assetTag}</DialogTitle>
          <DialogDescription>
            Previously assigned to: {asset?.assignee ?? "Unknown"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6 pt-4">
          <div className="flex flex-col gap-3">
            <Label>Condition</Label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="condition"
                  value="Good Working Condition"
                  checked={condition === "Good Working Condition"}
                  onChange={(e) => setCondition(e.target.value)}
                />
                Good Working Condition
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="condition"
                  value="Minor Issues"
                  checked={condition === "Minor Issues"}
                  onChange={(e) => setCondition(e.target.value)}
                />
                Minor Issues
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="condition"
                  value="Needs Repair"
                  checked={condition === "Needs Repair"}
                  onChange={(e) => setCondition(e.target.value)}
                />
                Needs Repair
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="condition"
                  value="Beyond Repair"
                  checked={condition === "Beyond Repair"}
                  onChange={(e) => setCondition(e.target.value)}
                />
                Beyond Repair
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Label htmlFor="notes">Condition Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="E.g., Screen is heavily scratched..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!condition || isSubmitting}>
              Confirm
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}