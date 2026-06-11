/**
 * asset-action-config.ts
 *
 * Single source of truth for which action buttons appear in the asset detail
 * panel footer based on the asset's current status, pillar, and software state.
 */

import type { ComponentProps } from 'react';
import type { Button } from '@/components/ui/button';

// ─── Action identifiers ───────────────────────────────────────────────────────
export type AssetActionId =
  | 'edit'
  | 'assign'
  | 'request-return'
  | 'remind-return'
  | 'mark-returned'
  | 'send-for-repair'
  | 'request-disposal'
  | 'add-user'
  | 'process-return';

export interface AssetActionConfig {
  id: AssetActionId;
  label: string;
  variant: ComponentProps<typeof Button>['variant'];
  disabled?: boolean;
}

// ─── Built-in status → action map ─────────────────────────────────────────────
// These statuses come from the `assetStatusEnum` in db/schema.ts

const EDIT_ACTION: AssetActionConfig = {
  id: 'edit',
  label: 'Edit',
  variant: 'outline',
};

const ASSIGN_ACTION: AssetActionConfig = {
  id: 'assign',
  label: 'Assign',
  variant: 'default',
};

const TRANSFER_ACTION: AssetActionConfig = {
  id: 'assign',
  label: 'Transfer',
  variant: 'default',
};

const REQUEST_RETURN_ACTION: AssetActionConfig = {
  id: 'request-return',
  label: 'Request Return',
  variant: 'default',
};

const REMIND_RETURN_ACTION: AssetActionConfig = {
  id: 'remind-return',
  label: 'Remind Again',
  variant: 'outline',
};

const MARK_RETURNED_ACTION: AssetActionConfig = {
  id: 'mark-returned',
  label: 'Returned',
  variant: 'default',
};

const SEND_FOR_REPAIR_ACTION: AssetActionConfig = {
  id: 'send-for-repair',
  label: 'Send for Repair',
  variant: 'outline',
};

const REQUEST_DISPOSAL_ACTION: AssetActionConfig = {
  id: 'request-disposal',
  label: 'Request Disposal',
  variant: 'destructive',
};

const ADD_USER_ACTION: AssetActionConfig = {
  id: 'add-user',
  label: 'Add User',
  variant: 'default',
};

const PROCESS_RETURN_ACTION: AssetActionConfig = {
  id: 'process-return',
  label: 'Process Return',
  variant: 'default',
};

// ─── Status → Actions mapping (Hardware) ──────────────────────────────────────

const HARDWARE_STATUS_ACTIONS: Record<string, AssetActionConfig[]> = {
  'Available':        [EDIT_ACTION, SEND_FOR_REPAIR_ACTION, REQUEST_DISPOSAL_ACTION, ASSIGN_ACTION],
  'Assigned':         [EDIT_ACTION, REQUEST_RETURN_ACTION],
  'In Repair':        [], // User chose to hide all buttons for "In Repair"
  'Defective':        [EDIT_ACTION, SEND_FOR_REPAIR_ACTION, REQUEST_DISPOSAL_ACTION],
  'Lost':             [EDIT_ACTION, REQUEST_DISPOSAL_ACTION],
  'Retired':          [EDIT_ACTION, REQUEST_DISPOSAL_ACTION],
  'Pending Disposal': [],
  'Disposed':         [],
  'Returned':         [EDIT_ACTION, PROCESS_RETURN_ACTION],
};

// ─── Status → Actions mapping (Furniture / Office Electronics) ────────────────
// Same as hardware but "Assign" becomes "Transfer" (location-only),
// and "Assigned" shows "Transfer" instead of "Request Return".

const FURNITURE_ELECTRONICS_STATUS_ACTIONS: Record<string, AssetActionConfig[]> = {
  'Available':        [EDIT_ACTION, SEND_FOR_REPAIR_ACTION, REQUEST_DISPOSAL_ACTION, TRANSFER_ACTION],
  'Assigned':         [EDIT_ACTION, TRANSFER_ACTION],
  'In Repair':        [],
  'Defective':        [EDIT_ACTION, SEND_FOR_REPAIR_ACTION, REQUEST_DISPOSAL_ACTION],
  'Lost':             [EDIT_ACTION, REQUEST_DISPOSAL_ACTION],
  'Retired':          [EDIT_ACTION, REQUEST_DISPOSAL_ACTION],
  'Pending Disposal': [],
  'Disposed':         [],
  'Returned':         [EDIT_ACTION, PROCESS_RETURN_ACTION],
};

// ─── Default actions for unknown/custom statuses ──────────────────────────────
// Treated like "Available" unless overridden by custom status configuration.

const DEFAULT_CUSTOM_STATUS_ACTIONS_HARDWARE: AssetActionConfig[] = [
  EDIT_ACTION,
  SEND_FOR_REPAIR_ACTION,
  REQUEST_DISPOSAL_ACTION,
  ASSIGN_ACTION,
];

const DEFAULT_CUSTOM_STATUS_ACTIONS_FURNITURE: AssetActionConfig[] = [
  EDIT_ACTION,
  SEND_FOR_REPAIR_ACTION,
  REQUEST_DISPOSAL_ACTION,
  TRANSFER_ACTION,
];

// ─── Public API ───────────────────────────────────────────────────────────────

export interface GetActionsOptions {
  /** The current asset status (e.g. 'Available', 'Assigned', 'Disposed') */
  status: string;
  /** The pillar/category (e.g. 'Hardware', 'Software', 'Office Furniture', 'Office Electronics') */
  pillar: string;
  /** Software-specific: are there seats available? */
  seatsAvailable?: boolean;
  /** Software-specific: is the license expired? */
  isExpired?: boolean;
  /** Optional: allowed action IDs from custom status configuration */
  customStatusAllowedActions?: AssetActionId[];
  /** Optional: the current assignment state (e.g. 'requested') */
  assignmentState?: string;
}

/**
 * Returns the list of action button configs that should be rendered in the
 * asset detail panel footer for the given asset state.
 */
export function getActionsForStatus(options: GetActionsOptions): AssetActionConfig[] {
  const { status, pillar, seatsAvailable, isExpired, customStatusAllowedActions, assignmentState } = options;

  // ── Software pillar ──
  if (pillar === 'Software') {
    if (status === 'Disposed' || status === 'Pending Disposal') {
      return [];
    }

    if (isExpired) {
      return [
        EDIT_ACTION,
        { ...ADD_USER_ACTION, label: 'License Expired', disabled: true },
      ];
    }

    if (seatsAvailable === false) {
      return [
        EDIT_ACTION,
        { ...ADD_USER_ACTION, label: 'Seats Full', disabled: true },
      ];
    }

    return [EDIT_ACTION, ADD_USER_ACTION];
  }

  // ── Furniture / Office Electronics ──
  const isFurnitureOrElectronics =
    pillar === 'Office Furniture' || pillar === 'Office Electronics';

  if (isFurnitureOrElectronics) {
    if (status === 'Assigned') {
      if (assignmentState === 'requested') {
        return [EDIT_ACTION, REMIND_RETURN_ACTION, MARK_RETURNED_ACTION];
      }
      return [EDIT_ACTION, TRANSFER_ACTION];
    }

    const builtInActions = FURNITURE_ELECTRONICS_STATUS_ACTIONS[status];
    if (builtInActions !== undefined) {
      return builtInActions;
    }

    // Custom status: use configured actions or defaults
    if (customStatusAllowedActions && customStatusAllowedActions.length > 0) {
      return resolveCustomActions(customStatusAllowedActions, true);
    }

    return DEFAULT_CUSTOM_STATUS_ACTIONS_FURNITURE;
  }

  // ── Hardware (default) ──
  if (status === 'Assigned') {
    if (assignmentState === 'requested') {
      return [EDIT_ACTION, REMIND_RETURN_ACTION, MARK_RETURNED_ACTION];
    }
    return [EDIT_ACTION, REQUEST_RETURN_ACTION];
  }

  const builtInActions = HARDWARE_STATUS_ACTIONS[status];
  if (builtInActions !== undefined) {
    return builtInActions;
  }

  // Custom status: use configured actions or defaults
  if (customStatusAllowedActions && customStatusAllowedActions.length > 0) {
    return resolveCustomActions(customStatusAllowedActions, false);
  }

  return DEFAULT_CUSTOM_STATUS_ACTIONS_HARDWARE;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACTION_ID_TO_CONFIG: Record<AssetActionId, (isFurniture: boolean) => AssetActionConfig> = {
  'edit':              () => EDIT_ACTION,
  'assign':            (isFurniture) => isFurniture ? TRANSFER_ACTION : ASSIGN_ACTION,
  'request-return':    () => REQUEST_RETURN_ACTION,
  'remind-return':     () => REMIND_RETURN_ACTION,
  'mark-returned':     () => MARK_RETURNED_ACTION,
  'send-for-repair':   () => SEND_FOR_REPAIR_ACTION,
  'request-disposal':  () => REQUEST_DISPOSAL_ACTION,
  'add-user':          () => ADD_USER_ACTION,
  'process-return':    () => PROCESS_RETURN_ACTION,
};

function resolveCustomActions(
  allowedActionIds: AssetActionId[],
  isFurnitureOrElectronics: boolean
): AssetActionConfig[] {
  return allowedActionIds
    .map((id) => ACTION_ID_TO_CONFIG[id]?.(isFurnitureOrElectronics))
    .filter((config): config is AssetActionConfig => config !== undefined);
}
