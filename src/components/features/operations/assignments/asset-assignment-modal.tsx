'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { assignAssetAction } from '@/actions/assignments';
import { tiqriToast } from '@/components/shared/sonner';
import {
  DURATION_OPTIONS,
  CUSTOM_DURATION_VALUE,
  findDurationPreset,
} from '@/lib/assignment-date-utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableDropdown } from '@/components/ui/searchable-dropdown';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { useAssignmentModalState } from './use-assignment-modal-state';

interface AssetAssignmentModalProps {
  isOpen: boolean;
  assetId: string;
  assetLabel: string;
  assetGroup: string;
  onOpenChange: (open: boolean) => void;
}

export function AssetAssignmentModal({
  isOpen,
  assetId,
  assetLabel,
  assetGroup,
  onOpenChange,
}: AssetAssignmentModalProps) {
  const router = useRouter();
  const disableUserAssignment =
    assetGroup === 'Office Furniture' || assetGroup === 'Office Electronics';

  const {
    assignmentMode,
    assignee,
    setAssignee,
    duration,
    expectedReturn,
    notes,
    setNotes,
    isSubmitting,
    setIsSubmitting,
    activeOptions,
    resetState,
    handleAssignmentModeChange,
    handleDurationChange,
    handleExpectedReturnChange,
    validateAssignment,
  } = useAssignmentModalState({ isOpen, disableUserAssignment });

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

    if (!assetId) {
      tiqriToast.error('Invalid asset id.');
      return;
    }

    if (!validateAssignment()) return;

    setIsSubmitting(true);

    const resolvedAssignmentMode = disableUserAssignment
      ? 'location'
      : assignmentMode;
    const expectedDate =
      resolvedAssignmentMode === 'user'
        ? expectedReturn || undefined
        : undefined;

    const assignInput = {
      assetId,
      assignmentType: resolvedAssignmentMode,
      targetId:
        resolvedAssignmentMode === 'location' ? Number(assignee) : assignee,
      expectedReturnDate: expectedDate,
      notes: notes || undefined,
    };

    assignAssetAction(assignInput)
      .then((result) => {
        if (!result.success) {
          throw new Error(result.error || 'Assignment failed.');
        }

        tiqriToast.success('Asset assigned successfully.');
        handleOpenChange(false);
        router.refresh();
      })
      .catch((error: unknown) => {
        tiqriToast.error(
          error instanceof Error ? error.message : 'Assignment failed.'
        );
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-140 rounded-xl p-0"
        showCloseButton={true}
      >
        <DialogHeader className="gap-1 px-6 pt-5 pb-4">
          <DialogTitle className="text-[18px] font-semibold text-foreground">
            Assign Asset:{' '}
            <span className="font-medium text-foreground">{assetLabel}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Choose how you would like to assign the selected assets.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 pt-4 pb-5">
          <div className="space-y-2">
            <label
              className={`flex items-center gap-2 text-sm ${disableUserAssignment ? 'cursor-not-allowed text-muted-foreground' : 'text-foreground'}`}
            >
              <input
                type="radio"
                name="assignment-mode"
                checked={assignmentMode === 'user'}
                disabled={disableUserAssignment}
                onChange={() => handleAssignmentModeChange('user')}
                className="size-4 border-border accent-primary"
              />
              Assign to User
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="assignment-mode"
                checked={assignmentMode === 'location'}
                onChange={() => handleAssignmentModeChange('location')}
                className="size-4 border-border accent-primary"
              />
              Assign to Location
            </label>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">
              {disableUserAssignment || assignmentMode === 'location'
                ? 'Select a location'
                : 'Select a user'}
            </Label>
            <SearchableDropdown
              options={activeOptions}
              value={assignee}
              onSelect={setAssignee}
              placeholder={
                disableUserAssignment || assignmentMode === 'location'
                  ? 'Select a location'
                  : 'Select a user'
              }
              emptyMessage={
                disableUserAssignment || assignmentMode === 'location'
                  ? 'No locations found.'
                  : 'No users found.'
              }
            />
          </div>

          {disableUserAssignment || assignmentMode === 'location' ? null : (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">
                Expected Return Date
              </Label>
              <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-2">
                <Select
                  key={duration || 'preset-duration'}
                  value={duration}
                  onValueChange={handleDurationChange}
                >
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue placeholder="Select duration">
                      {findDurationPreset(duration)?.label ??
                        (duration ? 'Custom' : undefined)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                    <SelectItem value={CUSTOM_DURATION_VALUE}>
                      Custom
                    </SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative">
                  <Input
                    type="date"
                    value={expectedReturn}
                    onChange={(event) =>
                      handleExpectedReturnChange(event.target.value)
                    }
                    className="h-9"
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
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90"
              disabled={isSubmitting}
            >
              Assign Asset
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
