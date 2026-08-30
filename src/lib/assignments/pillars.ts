/**
 * Which pillars are assigned to a place rather than a person.
 *
 * A desk or a projector belongs to a room; a laptop belongs to someone. The
 * distinction decides three things that were previously each deciding it
 * separately: the assignment modal hides the "assign to user" option, the
 * detail panel labels the target "Location" rather than "Assigned to", and
 * registering one of these with a location marks it Assigned rather than
 * Available.
 */
export const LOCATION_ASSIGNED_PILLARS = [
  'Office Furniture',
  'Office Electronics',
] as const;

export type LocationAssignedPillar = (typeof LOCATION_ASSIGNED_PILLARS)[number];

/** True when assets in this pillar are assigned to a location, not a user. */
export function isLocationAssignedPillar(
  pillar: string | null | undefined
): boolean {
  return LOCATION_ASSIGNED_PILLARS.includes(pillar as LocationAssignedPillar);
}
