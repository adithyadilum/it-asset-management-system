import { differenceInDays } from 'date-fns';

/**
 * A licence warns once this share or less of its seats is still free.
 *
 * Expressed as seats remaining rather than seats used so the band means the
 * same thing at every licence size: 10% left is 4 seats on a 40-seat licence
 * and 1 on a 10-seat one. The previous rule warned at 20% remaining, which on
 * a small licence fired while a fifth of it was still unused.
 */
export const SOFTWARE_LICENSE_WARNING_REMAINING_PERCENT = 10;

/**
 * Seats that must remain before a licence stops warning.
 *
 * Rounded up and floored at one, so every licence gets at least a one-seat
 * warning band. Without the floor a 4-seat licence would want 0.4 seats left
 * and could only ever be "available" or "full", skipping the warning entirely.
 */
export function softwareLicenseWarningThreshold(totalSeats: number) {
  if (totalSeats <= 0) return 0;
  return Math.max(
    1,
    Math.ceil((totalSeats * SOFTWARE_LICENSE_WARNING_REMAINING_PERCENT) / 100)
  );
}

export function isSoftwareLicenseNearCapacity(
  totalSeats: number,
  availableSeats: number
) {
  if (totalSeats <= 0 || availableSeats <= 0) {
    // No seats left is "full", which is a different state.
    return false;
  }

  // Nothing handed out yet is never "near capacity", even on a one-seat
  // licence where the threshold and the seat count are both 1.
  const assignedSeats = totalSeats - availableSeats;
  if (assignedSeats <= 0) return false;

  return availableSeats <= softwareLicenseWarningThreshold(totalSeats);
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
