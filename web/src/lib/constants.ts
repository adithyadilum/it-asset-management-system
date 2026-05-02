// lib/constants.ts
export const ASSET_STATUSES = {
    // Workflow Dependent (Hidden from manual dropdown)
    ASSIGNED: 'Assigned',
    IN_REPAIR: 'In Repair',
    DISPOSED: 'Disposed',
    PENDING: 'Pending Review',

    // Permissible for Manual Override
    AVAILABLE: 'Available',
    LOST: 'Lost',
    STOLEN: 'Stolen',
    DEFECTIVE: 'Defective',
} as const;

export const MANUAL_OVERRIDE_STATUSES = [
    ASSET_STATUSES.AVAILABLE,
    ASSET_STATUSES.LOST,
    ASSET_STATUSES.STOLEN,
    ASSET_STATUSES.DEFECTIVE,
];

export const WORKFLOW_GATED_STATUSES = [
    ASSET_STATUSES.ASSIGNED,
    ASSET_STATUSES.IN_REPAIR,
    ASSET_STATUSES.DISPOSED,
    ASSET_STATUSES.PENDING,
] as const;

export const STATUSES_REQUIRING_ASSIGNMENT_CLOSURE = new Set<string>([
    ASSET_STATUSES.LOST,
    ASSET_STATUSES.STOLEN,
    ASSET_STATUSES.DEFECTIVE,
]);