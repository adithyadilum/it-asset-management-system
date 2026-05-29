"use client";

import * as React from "react";
import { Trash2, AlertCircle, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface DeleteItem {
  id: string;
  name: string;
  category?: string;
  [key: string]: unknown; // Allow additional properties while preserving type-safety
}

export interface DestructiveConfirmationDialogProps {
  // Trigger
  triggerLabel?: string;
  triggerVariant?: React.ComponentProps<typeof Button>["variant"];
  triggerClassName?: string;
  triggerIcon?: React.ReactNode;

  // Dialog Content
  title: string; // e.g., "Delete Category", "Delete Model", "Delete Location"
  description: string; // e.g., "Are you sure you want to delete these..."
  itemsToDelete: DeleteItem[];

  // Table Display
  columns: Array<{
    key: string; // e.g., "id", "name"
    label: string; // e.g., "ID", "Name"
    width?: string; // e.g., "w-1/4" (for 4 columns)
  }>;

  // Error State (optional)
  errorMessage?: string;
  canDelete?: boolean; // If false, shows error and disables delete
  errorItemIds?: string[]; // IDs of items that have errors (red border highlight)

  // Callbacks
  onConfirm: () => Promise<void> | void;
  onCancel?: () => void;

  // UI Customization
  deleteButtonLabel?: string;
  cancelButtonLabel?: string;
  showDeleteIcon?: boolean;

  // Loading State
  isLoading?: boolean;

  // Controlled State (optional - if not provided, uses trigger button)
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const DestructiveConfirmationDialog = React.forwardRef<
  HTMLButtonElement,
  DestructiveConfirmationDialogProps
>(
  (
    {
      // Trigger
      triggerLabel = "Delete",
      triggerVariant = "destructive",
      triggerClassName = "",
      triggerIcon = null,

      // Dialog
      title,
      description,
      itemsToDelete,
      columns,

      // Error
      errorMessage,
      canDelete = true,
      errorItemIds = [],

      // Callbacks
      onConfirm,
      onCancel,

      // Labels
      deleteButtonLabel = "Delete",
      cancelButtonLabel = "Cancel",
      showDeleteIcon = true,

      // Loading
      isLoading = false,

      // Controlled State
      open: controlledOpen,
      onOpenChange: controlledOnOpenChange,
    },
    ref
  ) => {
    // Support both controlled and uncontrolled modes
    const isControlled = controlledOpen !== undefined;
    const [internalOpen, setInternalOpen] = React.useState(false);
    const open = isControlled ? controlledOpen : internalOpen;
    const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;
    const [loading, setLoading] = React.useState(false);

    const handleConfirm = async () => {
      try {
        setLoading(true);
        await onConfirm();
        setOpen(false);
      } catch (error) {
        console.error("Delete operation failed:", error);
      } finally {
        setLoading(false);
      }
    };

    const handleCancel = () => {
      setOpen(false);
      onCancel?.();
    };

    // Check if an item has an error
    const hasError = (itemId: string) => errorItemIds.includes(itemId);

    return (
      <AlertDialog open={open} onOpenChange={setOpen}>
        {/* ===== TRIGGER BUTTON (only show in uncontrolled mode) ===== */}
        {!isControlled && (
          <AlertDialogTrigger asChild>
            <Button
              ref={ref}
              variant={triggerVariant}
              className={triggerClassName}
              disabled={isLoading}
            >
              {triggerIcon || (showDeleteIcon && <Trash2 className="mr-2 h-4 w-4" />)}
              {triggerLabel}
            </Button>
          </AlertDialogTrigger>
        )}

        {/* ===== DIALOG CONTENT ===== */}
        <AlertDialogContent className="w-full max-w-2xl rounded-lg bg-popover p-6 text-popover-foreground shadow-lg">
          {/* ===== HEADER: Title + Close Icon ===== */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <AlertDialogTitle className="text-lg font-semibold">
                {title}
              </AlertDialogTitle>
            </div>
            {/* Close button (visual - X icon) */}
            <button
              onClick={handleCancel}
              className="rounded p-1 hover:bg-muted"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* ===== DESCRIPTION ===== */}
          <AlertDialogDescription className="mt-2 text-sm text-muted-foreground">
            {description}
          </AlertDialogDescription>

          {/* ===== ITEMS TABLE ===== */}
          <div className="my-4 space-y-3">
            {itemsToDelete.map((item) => {
              const itemHasError = hasError(item.id);
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between rounded-md p-4 transition-colors ${itemHasError
                    ? "border-2 border-red-500 bg-red-50"
                    : "bg-muted"
                    }`}
                >
                  <div className="flex flex-1 gap-6">
                    {/* Display all columns */}
                    {columns.map((col) => (
                      <div
                        key={col.key}
                        className={`${col.width || "flex-1"} text-sm font-medium text-foreground`}
                      >
                        {String(item[col.key] ?? "-")}
                      </div>
                    ))}
                  </div>
                  {/* Delete icon (trash) */}
                  <Trash2 className="ml-3 h-4 w-4 text-red-500" />
                </div>
              );
            })}
          </div>

          {/* ===== ERROR MESSAGE (Conditional) ===== */}
          {errorMessage && !canDelete && (
            <div className="mt-4 rounded-md bg-red-50 p-3">
              <p className="text-sm font-medium text-red-700">{errorMessage}</p>
            </div>
          )}

          {/* ===== FOOTER: Buttons ===== */}
          <AlertDialogFooter className="mt-6 flex justify-end gap-3">
            <AlertDialogCancel onClick={handleCancel} variant="outline">
              {cancelButtonLabel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={!canDelete || loading}
              variant="destructive"
            >
              {loading ? "Deleting..." : deleteButtonLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
);

DestructiveConfirmationDialog.displayName =
  "DestructiveConfirmationDialog";