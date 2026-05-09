/**
 * Shared date utilities for asset assignment modals (single and bulk).
 * Handles date conversions and duration calculations for assignment return dates.
 */

export const DURATION_OPTIONS = [7, 14, 30] as const;

const DAY_IN_MS = 24 * 60 * 60 * 1000;

/**
 * Check if a value is a preset duration option.
 */
export const isPresetDuration = (value: string): boolean =>
  DURATION_OPTIONS.some((option) => String(option) === value);

/**
 * Convert a Date object to YYYY-MM-DD string format.
 */
export function toDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get the local start of day (midnight) for a given date.
 */
export function getLocalStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Calculate the expected return date by adding duration days to today.
 */
export function calculateExpectedReturnDate(durationDays: number): string {
  const today = getLocalStartOfDay(new Date());
  today.setDate(today.getDate() + durationDays);
  return toDateValue(today);
}

/**
 * Calculate the duration in days from today to a given date.
 * Returns an empty string if the date is invalid or in the past.
 */
export function calculateDurationFromDate(dateValue: string): string {
  const [year, month, day] = dateValue.split("-").map((part) => Number(part));

  if (!year || !month || !day) {
    return "";
  }

  const selectedDate = new Date(year, month - 1, day);

  if (Number.isNaN(selectedDate.getTime())) {
    return "";
  }

  const today = getLocalStartOfDay(new Date());
  const diffDays = Math.round((selectedDate.getTime() - today.getTime()) / DAY_IN_MS);
  return diffDays > 0 ? String(diffDays) : "";
}
