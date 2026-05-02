// lib/constants.ts

// These values MUST match the PostgreSQL `asset_status` enum exactly:
// 'Available', 'Assigned', 'In Repair', 'Defective', 'Lost', 'Retired', 'Pending Disposal', 'Disposed'
export const ASSET_STATUSES = {
    // Workflow Dependent (Hidden from manual dropdown)
    ASSIGNED: 'Assigned',
    IN_REPAIR: 'In Repair',
    DISPOSED: 'Disposed',
    PENDING_DISPOSAL: 'Pending Disposal',

    // Permissible for Manual Override
    AVAILABLE: 'Available',
    LOST: 'Lost',
    DEFECTIVE: 'Defective',
    RETIRED: 'Retired',
} as const;

// Only statuses that exist in the DB enum and are safe for manual override
export const MANUAL_OVERRIDE_STATUSES = [
    ASSET_STATUSES.AVAILABLE,
    ASSET_STATUSES.LOST,
    ASSET_STATUSES.DEFECTIVE,
    ASSET_STATUSES.RETIRED,
];

export const WORKFLOW_GATED_STATUSES = [
    ASSET_STATUSES.ASSIGNED,
    ASSET_STATUSES.IN_REPAIR,
    ASSET_STATUSES.DISPOSED,
    ASSET_STATUSES.PENDING_DISPOSAL,
] as const;

export const STATUSES_REQUIRING_ASSIGNMENT_CLOSURE = new Set<string>([
    ASSET_STATUSES.LOST,
    ASSET_STATUSES.DEFECTIVE,
    ASSET_STATUSES.RETIRED,
]);