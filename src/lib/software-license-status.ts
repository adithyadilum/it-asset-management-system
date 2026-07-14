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
