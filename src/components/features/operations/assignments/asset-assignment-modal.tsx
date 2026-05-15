"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { assignAssetAction } from "@/actions/assignments";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface AssetAssignmentModalProps {
  isOpen: boolean;
  assetId: string;
  assetLabel: string;
  assetGroup: string;
  onOpenChange: (open: boolean) => void;
}

type AssigneeOption = {
  id: string;
  label: string;
};

export function AssetAssignmentModal({
  isOpen,
  assetId,
  assetLabel,
  assetGroup,
  onOpenChange,
}: AssetAssignmentModalProps) {
  const router = useRouter();
  const disableUserAssignment =
    assetGroup === "Office Furniture" || assetGroup === "Office Electronics";
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

    if (!assetId) {
      tiqriToast.error("Invalid asset id.");
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
      // Parse YYYY-MM-DD as local date to avoid timezone issues (new Date(str) parses as UTC)
      const parts = expectedReturn.split("-").map((p) => Number(p));
      const selectedDate = parts.length === 3
        ? new Date(parts[0], (parts[1] || 1) - 1, parts[2])
        : new Date(expectedReturn);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        tiqriToast.error("Select a valid date");
        return;
      }
    }

    setIsSubmitting(true);

    const expectedDate = resolvedAssignmentMode === "user" ? expectedReturn || undefined : undefined;
    const assignInput = {
      assetId,
      assignmentType: resolvedAssignmentMode,
      targetId: resolvedAssignmentMode === "location" ? Number(assignee) : assignee,
      expectedReturnDate: expectedDate,
      notes: notes || undefined,
    };

    assignAssetAction(assignInput)
      .then((result) => {
        if (!result.success) {
          throw new Error(result.error || "Assignment failed.");
        }

        tiqriToast.success("Asset assigned successfully.");
        handleOpenChange(false);
        router.refresh();
      })
      .catch((error: unknown) => {
        tiqriToast.error(
          error instanceof Error ? error.message : "Assignment failed."
        );
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const handleAssignmentModeChange = React.useCallback((mode: "user" | "location") => {
    setAssignmentMode(mode);
    setAssignee("");
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

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-140 rounded-xl p-0" showCloseButton={true}>
        <DialogHeader className="gap-1 px-6 pt-5 pb-4">
          <DialogTitle className="text-[18px] font-semibold text-slate-900">
            Assign Asset: <span className="font-medium text-slate-700">{assetLabel}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Choose how you would like to assign the selected assets.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 pt-4 pb-5">
          <div className="space-y-2">
            <label className={`flex items-center gap-2 text-sm ${disableUserAssignment ? "cursor-not-allowed text-slate-400" : "text-slate-700"}`}>
              <input
                type="radio"
                name="assignment-mode"
                checked={assignmentMode === "user"}
                disabled={disableUserAssignment}
                onChange={() => handleAssignmentModeChange("user")}
                className="size-4 border-slate-300 accent-[#00145a]"
              />
              Assign to User
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="assignment-mode"
                checked={assignmentMode === "location"}
                onChange={() => handleAssignmentModeChange("location")}
                className="size-4 border-slate-300 accent-[#00145a]"
              />
              Assign to Location
            </label>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">
              {disableUserAssignment || assignmentMode === "location" ? "Select a location" : "Select a user"}
            </Label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger className="h-9 bg-white">
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
              <Label className="text-xs font-medium text-slate-700">Expected Return Date</Label>
              <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-2">
                <Select key={duration || "preset-duration"} value={`${duration}`} onValueChange={handleDurationChange}>
                  <SelectTrigger className="h-9 bg-white">
                    <SelectValue placeholder="Select duration">
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

                <div className="relative">
                  <Input
                    type="date"
                    value={expectedReturn}
                    onChange={(event) => handleExpectedReturnChange(event.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">Notes</Label>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add any additional notes"
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
            <Button type="submit" className="bg-[#00145a] hover:bg-[#000d3d]" disabled={isSubmitting}>
              Assign Asset
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
