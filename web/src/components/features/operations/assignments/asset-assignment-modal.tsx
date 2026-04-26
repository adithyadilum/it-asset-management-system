"use client";

import * as React from "react";
import { CalendarDays } from "lucide-react";

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
  assetLabel: string;
  onOpenChange: (open: boolean) => void;
}

export function AssetAssignmentModal({
  isOpen,
  assetLabel,
  onOpenChange,
}: AssetAssignmentModalProps) {
  const [assignmentMode, setAssignmentMode] = React.useState<"user" | "location">("user");
  const [assignee, setAssignee] = React.useState("");
  const [duration, setDuration] = React.useState("");
  const [expectedReturn, setExpectedReturn] = React.useState("");
  const [notes, setNotes] = React.useState("");

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
    handleOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[560px] rounded-xl p-0" showCloseButton={true}>
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
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="assignment-mode"
                checked={assignmentMode === "user"}
                onChange={() => setAssignmentMode("user")}
                className="size-4 border-slate-300 accent-[#00145a]"
              />
              Assign to User
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="assignment-mode"
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
                {assignmentMode === "user" ? (
                  <>
                    <SelectItem value="mark-kim">Mark Kim</SelectItem>
                    <SelectItem value="jane-doe">Jane Doe</SelectItem>
                    <SelectItem value="john-smith">John Smith</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="hq-admin">HQ Admin</SelectItem>
                    <SelectItem value="finance-floor">Finance Floor</SelectItem>
                    <SelectItem value="it-lab">IT Lab</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {assignmentMode === "user" ? (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Expected Return Date</Label>
              <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-2">
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className="h-9 bg-white">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative">
                  <Input
                    type="date"
                    value={expectedReturn}
                    onChange={(event) => setExpectedReturn(event.target.value)}
                    className="h-9 pr-8"
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
              placeholder="Add any additional notes"
              className="min-h-[80px] resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-[#00145a] hover:bg-[#000d3d]">
              Assign Asset
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
