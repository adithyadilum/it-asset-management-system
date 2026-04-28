"use client";

import * as React from "react";
import { CalendarDays } from "lucide-react";
import { useRouter } from "next/navigation";

import { bulkAssignAssetsAction } from "@/actions/assignments";
import { searchUsers } from "@/actions/users";
import { searchLocations } from "@/actions/locations";
import { tiqriToast } from "@/components/shared/sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type MultiAssetAssignmentItem = {
  assetId: string;
  assetName: string;
};

interface MultiAssetAssignmentModalProps {
  isOpen: boolean;
  assets: MultiAssetAssignmentItem[];
  onOpenChange: (open: boolean) => void;
}

type AssigneeOption = {
  id: string;
  label: string;
};

export function MultiAssetAssignmentModal({
  isOpen,
  assets,
  onOpenChange,
}: MultiAssetAssignmentModalProps) {
  const router = useRouter();
  const [assignmentMode, setAssignmentMode] = React.useState<"user" | "location">("user");
  const [assignee, setAssignee] = React.useState("");
  const [duration, setDuration] = React.useState("");
  const [expectedReturn, setExpectedReturn] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [userOptions, setUserOptions] = React.useState<AssigneeOption[]>([]);
  const [locationOptions, setLocationOptions] = React.useState<AssigneeOption[]>([]);

  const activeOptions = assignmentMode === "user" ? userOptions : locationOptions;

  const loadOptions = React.useCallback(async () => {
    try {
      const [usersResult, locationsResult] = await Promise.all([
        searchUsers(),
        searchLocations(),
      ]);

      if (!usersResult.success || !locationsResult.success) {
        throw new Error("Failed to load assignment options.");
      }

      setUserOptions(
        (usersResult.data ?? []).map((user) => ({
          id: user.id,
          label: user.name,
        }))
      );

      setLocationOptions(
        (locationsResult.data ?? []).map((location) => ({
          id: String(location.id),
          label: location.name,
        }))
      );
    } catch {
      tiqriToast.error("Failed to load assignment options.");
    }
  }, []);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    loadOptions();
  }, [isOpen, loadOptions]);

  const resetState = React.useCallback(() => {
    setAssignmentMode("user");
    setAssignee("");
    setDuration("");
    setExpectedReturn("");
    setNotes("");
  }, []);

  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        resetState();
      }
      onOpenChange(open);
    },
    [onOpenChange, resetState]
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (assets.length === 0) {
      tiqriToast.warning("Select at least one asset.");
      return;
    }

    if (!assignee) {
      tiqriToast.warning(
        assignmentMode === "user"
          ? "Please select a user."
          : "Please select a location."
      );
      return;
    }

    setIsSubmitting(true);

    const expectedDate = assignmentMode === "user" ? expectedReturn || undefined : undefined;
    const bulkAssignInput = {
      assetIds: assets.map((asset) => asset.assetId),
      assignmentType: assignmentMode,
      targetId: assignmentMode === "location" ? Number(assignee) : assignee,
      expectedReturnDate: expectedDate,
      notes: notes || undefined,
    };

    bulkAssignAssetsAction(bulkAssignInput)
      .then((result) => {
        if (!result.success) {
          throw new Error(result.error || "Bulk assignment failed.");
        }

        tiqriToast.success("Assets assigned successfully.");
        handleOpenChange(false);
        router.refresh();
      })
      .catch((error: unknown) => {
        tiqriToast.error(
          error instanceof Error ? error.message : "Bulk assignment failed."
        );
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const assetCount = assets.length;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[640px] rounded-xl p-0" showCloseButton={true}>
        <DialogHeader className="gap-1 px-6 pt-5 pb-4">
          <DialogTitle className="text-[18px] font-semibold text-slate-900">
            Assign {assetCount} {assetCount === 1 ? "Asset" : "Assets"}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Choose how you would like to assign the selected assets.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 pt-2 pb-5">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
            <ScrollArea className="h-[86px] w-full">
              <div className="space-y-2 p-3">
                {assets.map((asset) => (
                  <div
                    key={asset.assetId}
                    className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-3 text-xs"
                  >
                    <p className="font-medium text-slate-700">{asset.assetId}</p>
                    <p className="truncate text-slate-700">{asset.assetName}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="multi-assignment-mode"
                checked={assignmentMode === "user"}
                onChange={() => setAssignmentMode("user")}
                className="size-4 border-slate-300 accent-[#00145a]"
              />
              Assign to User
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="multi-assignment-mode"
                checked={assignmentMode === "location"}
                onChange={() => setAssignmentMode("location")}
                className="size-4 border-slate-300 accent-[#00145a]"
              />
              Assign to Location
            </label>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">
              {assignmentMode === "user" ? "Select a user" : "Select a location"}
            </Label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger className="h-9 bg-white">
                <SelectValue
                  placeholder={
                    assignmentMode === "user" ? "Select a user" : "Select a location"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {activeOptions.length > 0 ? (
                  activeOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="__empty" disabled>
                    No options available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {assignmentMode === "user" ? (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Expected Return Date</Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[160px_minmax(0,1fr)]">
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className="h-9 w-full bg-white">
                    <SelectValue placeholder="Select the duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative min-w-0">
                  <Input
                    type="date"
                    value={expectedReturn}
                    onChange={(event) => setExpectedReturn(event.target.value)}
                    className="h-9 w-full pr-8"
                  />
                  <CalendarDays className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">Notes</Label>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add any additional Notes"
              className="min-h-[80px] resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-[#00145a] hover:bg-[#000d3d]" disabled={isSubmitting}>
              Assign Asset
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
