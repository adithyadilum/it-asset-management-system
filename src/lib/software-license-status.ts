import { differenceInDays } from 'date-fns';

export const SOFTWARE_LICENSE_WARNING_UTILIZATION_PERCENT = 80;

export function isSoftwareLicenseNearCapacity(
  totalSeats: number,
  availableSeats: number
) {
  if (totalSeats <= 0 || availableSeats <= 0) {
    return false;
  }

  const assignedSeats = Math.max(0, totalSeats - availableSeats);
  return (
    assignedSeats < totalSeats &&
    assignedSeats * 100 >=
      totalSeats * SOFTWARE_LICENSE_WARNING_UTILIZATION_PERCENT
  );
}

/**
 * A licence is expired once its expiry date is in the past. No date at all
 * means a perpetual licence, which never expires.
 *
 * Shared so the badge and the bulk-selection rules agree on what "expired"
 * means -- they are what decide whether a row offers Renew or Assign.
 */
export function isSoftwareLicenseExpired(
  expiryDate?: string | Date | null
): boolean {
  if (!expiryDate) return false;
  const parsed = new Date(expiryDate);
  if (Number.isNaN(parsed.getTime())) return false;
  return differenceInDays(parsed, new Date()) < 0;
}
