/**
 * What returning an asset in a given condition does to its status.
 *
 * Shared because the person filling in the return form needs to know the
 * consequence before they submit it, and the server needs to apply it. A copy
 * on each side would drift -- which is exactly how the assignment panels ended
 * up disagreeing.
 */

export const RETURN_CONDITIONS = [
  'Good Working Condition',
  'Minor Issues',
  'Needs Repair',
  'Beyond Repair',
] as const;

export type ReturnCondition = (typeof RETURN_CONDITIONS)[number];

const OUTCOME_BY_CONDITION: Record<ReturnCondition, string> = {
  'Good Working Condition': 'Available',
  'Minor Issues': 'In Repair',
  'Needs Repair': 'In Repair',
  'Beyond Repair': 'Pending Disposal',
};

/** The status the asset moves to. Unknown conditions fall back to Available. */
export function resolveReturnStatus(condition: string | null | undefined) {
  if (!condition) return null;
  return OUTCOME_BY_CONDITION[condition as ReturnCondition] ?? 'Available';
}

/**
 * One line explaining the consequence, for the return form.
 */
export function describeReturnOutcome(condition: string | null | undefined) {
  const status = resolveReturnStatus(condition);
  if (!status) return null;

  switch (status) {
    case 'In Repair':
      return 'This asset will move to In Repair and a maintenance ticket will be opened.';
    case 'Pending Disposal':
      return 'This asset will move to Pending Disposal and leave the active registry.';
    default:
      return 'This asset will return to Available and can be assigned again.';
  }
}
