"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { bulkAssignAssetsAction } from "@/actions/assignments";
import { searchUsers } from "@/actions/users";
import { searchLocations } from "@/actions/locations";
import { tiqriToast } from "@/components/shared/sonner";
import {
  DURATION_OPTIONS,
  isPresetDuration,
  calculateExpectedReturnDate,
  calculateDurationFromDate,
} from "@/lib/assignment-date-utils";
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
  assetTag: string;
  assetName: string;
  assetGroup: string;
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
  const disableUserAssignment = assets.some(
    (asset) => asset.assetGroup === "Office Furniture" || asset.assetGroup === "Office Electronics"
  );
  const [assignmentMode, setAssignmentMode] = React.useState<"user" | "location">(() =>
    disableUserAssignment ? "location" : "user"
  );
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

    let mounted = true;

    (async () => {
      if (!mounted) return;
      await loadOptions();
    })();

    return () => {
      mounted = false;
    };
  }, [isOpen, loadOptions]);

  const resetState = React.useCallback(() => {
    setAssignmentMode(disableUserAssignment ? "location" : "user");
    setAssignee("");
    setDuration("");
    setExpectedReturn("");
    setNotes("");
  }, [disableUserAssignment]);

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
    const resolvedAssignmentMode = disableUserAssignment ? "location" : assignmentMode;

    if (assets.length === 0) {
      tiqriToast.warning("Select at least one asset.");
      return;
    }

    if (!assignee) {
      tiqriToast.warning(
        resolvedAssignmentMode === "user"
          ? "Please select a user."
          : "Please select a location."
      );
      return;
    }

    if (resolvedAssignmentMode === "user" && expectedReturn) {
      const [year, month, day] = expectedReturn.split("-").map(Number);
      const selectedDate = new Date(year, month - 1, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        tiqriToast.error("Select a valid date");
        return;
      }
    }

    setIsSubmitting(true);

    const expectedDate = resolvedAssignmentMode === "user" ? expectedReturn || undefined : undefined;
    const bulkAssignInput = {
      assetIds: assets.map((asset) => asset.assetId),
      assignmentType: resolvedAssignmentMode,
      targetId: resolvedAssignmentMode === "location" ? Number(assignee) : assignee,
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

  const handleAssignmentModeChange = React.useCallback((mode: "user" | "location") => {
    setAssignmentMode(mode);
    setDuration("");
    setExpectedReturn("");
  }, []);

  const handleDurationChange = React.useCallback((value: string) => {
    setDuration(`${value}`);

    const durationDays = Number(value);
    if (Number.isFinite(durationDays) && durationDays > 0) {
      setExpectedReturn(calculateExpectedReturnDate(durationDays));
      return;
    }

    setExpectedReturn("");
  }, []);

  const handleExpectedReturnChange = React.useCallback((value: string) => {
    setExpectedReturn(value);

    const calculatedDuration = calculateDurationFromDate(value);
    setDuration(`${calculatedDuration}`);
  }, []);

  const assetCount = assets.length;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-160 rounded-xl p-0" showCloseButton={true}>
        <DialogHeader className="gap-1 px-6 pt-5 pb-4">
          <DialogTitle className="text-[18px] font-semibold text-foreground">
            Assign {assetCount} {assetCount === 1 ? "Asset" : "Assets"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Choose how you would like to assign the selected assets.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 pt-2 pb-5">
          <div className="overflow-hidden rounded-lg border border-border bg-muted">
            <ScrollArea className="h-21.5 w-full">
              <div className="space-y-2 p-3">
                {assets.map((asset) => (
                  <div
                    key={asset.assetId}
                    className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-3 text-xs"
                  >
                    <p className="font-medium text-foreground">{asset.assetTag}</p>
                    <p className="truncate text-foreground">{asset.assetName}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="space-y-2">
            <label className={`flex items-center gap-2 text-sm ${disableUserAssignment ? "cursor-not-allowed text-muted-foreground" : "text-foreground"}`}>
              <input
                type="radio"
                name="multi-assignment-mode"
                checked={assignmentMode === "user"}
                disabled={disableUserAssignment}
                onChange={() => handleAssignmentModeChange("user")}
                className="size-4 border-border accent-primary"
              />
              Assign to User
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="multi-assignment-mode"
                checked={assignmentMode === "location"}
                onChange={() => handleAssignmentModeChange("location")}
                className="size-4 border-border accent-primary"
              />
              Assign to Location
            </label>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">
              {disableUserAssignment || assignmentMode === "location" ? "Select a location" : "Select a user"}
            </Label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger className="h-9 bg-background">
                <SelectValue
                  placeholder={
                    disableUserAssignment || assignmentMode === "location"
                      ? "Select a location"
                      : "Select a user"
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

          {disableUserAssignment || assignmentMode === "location" ? null : (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Expected Return Date</Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[160px_minmax(0,1fr)]">
                <Select key={duration || "preset-duration"} value={`${duration}`} onValueChange={handleDurationChange}>
                  <SelectTrigger className="h-9 w-full bg-background">
                    <SelectValue placeholder="Select the duration">
                      {duration ? `${duration} days` : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((option) => (
                      <SelectItem key={option} value={`${option}`}>
                        {option} days
                      </SelectItem>
                    ))}
                    {duration !== "" && !isPresetDuration(duration) ? (
                      <SelectItem value={`${duration}`}>{duration} days</SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>

                <div className="relative min-w-0">
                  <Input
                    type="date"
                    value={expectedReturn}
                    onChange={(event) => handleExpectedReturnChange(event.target.value)}
                    className="h-9 w-full"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">Notes</Label>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add any additional Notes"
              className="min-h-20 resize-none"
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
            <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isSubmitting}>
              Assign {assets.length} {assets.length === 1 ? "Asset" : "Assets"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
