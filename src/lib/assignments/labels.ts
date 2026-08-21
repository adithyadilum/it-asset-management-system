import { assignmentStateEnum } from '@/db/schema';

export type AssignmentState = (typeof assignmentStateEnum.enumValues)[number];

/**
 * Human labels for `asset_assignments.state`.
 *
 * The stored values are an implementation detail — `'pending approval'` in
 * particular reads as though somebody must sign the assignment off, when what
 * it actually means is that the assignee has not acknowledged it yet. The grid
 * used to print the raw enum with a CSS `capitalize`, so the database wording
 * leaked straight into the UI.
 *
 * Deliberately a display map rather than a renamed enum value: the value is
 * persisted on every row, embedded in `system_audit_logs.new_value` on every
 * historical assignment, and exposed raw by the public
 * `/api/v1/assets/my-assets` contract. Renaming it would need all three
 * migrated in lockstep for no user-visible gain over this.
 */
export const ASSIGNMENT_STATE_LABELS: Record<AssignmentState, string> = {
  'pending approval': 'Pending assignment',
  assigned: 'Assigned',
  overdue: 'Overdue',
  requested: 'Return requested',
  returned: 'Returned',
};

/**
 * Label for an assignment state, falling back to the raw value so an enum
 * added to the schema without a label here degrades to today's behaviour
 * instead of rendering blank.
 */
export function formatAssignmentState(state: string): string {
  return ASSIGNMENT_STATE_LABELS[state as AssignmentState] ?? state;
}

/**
 * The states offered as report filters, as `{ value, label }` so the option
 * text and the stored value stay decoupled.
 */
export const ASSIGNMENT_STATE_FILTER_OPTIONS = (
  Object.keys(ASSIGNMENT_STATE_LABELS) as AssignmentState[]
).map((value) => ({ value, label: ASSIGNMENT_STATE_LABELS[value] }));
