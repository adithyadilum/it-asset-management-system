/**
 * Shared date utilities for asset assignment modals (single and bulk).
 * Handles date conversions and duration presets for assignment return dates.
 */

/**
 * A quick-pick loan length.
 *
 * Longer terms are expressed in months rather than days on purpose: "1 year"
 * has to land on the same calendar day next year, and approximating it as 365
 * days drifts across a leap year. Short terms stay in days because that is what
 * they mean — a 7-day loan is seven days, not "a quarter of a month".
 */
export interface DurationPreset {
  /** Stored in form state and used as the `<SelectItem>` value. */
  value: string;
  label: string;
  days?: number;
  months?: number;
}

export const DURATION_OPTIONS: readonly DurationPreset[] = [
  { value: '7d', label: '7 days', days: 7 },
  { value: '14d', label: '14 days', days: 14 },
  { value: '30d', label: '30 days', days: 30 },
  { value: '6m', label: '6 months', months: 6 },
  { value: '1y', label: '1 year', months: 12 },
  { value: '2y', label: '2 years', months: 24 },
  { value: '5y', label: '5 years', months: 60 },
] as const;

/** Sentinel for "the date was typed, not picked from the list". */
export const CUSTOM_DURATION_VALUE = 'custom';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

/**
 * Check if a value is a preset duration option.
 */
export const isPresetDuration = (value: string): boolean =>
  DURATION_OPTIONS.some((option) => option.value === value);

export const findDurationPreset = (value: string): DurationPreset | undefined =>
  DURATION_OPTIONS.find((option) => option.value === value);

/**
 * Convert a Date object to YYYY-MM-DD string format.
 */
export function toDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get the local start of day (midnight) for a given date.
 */
export function getLocalStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Add whole months, clamping to the end of the target month.
 *
 * Without the clamp, 31 August + 6 months would roll through to 3 March —
 * `Date` silently overflows a day-of-month the target month does not have.
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(
    date.getFullYear(),
    date.getMonth() + months,
    date.getDate()
  );

  if (result.getDate() !== date.getDate()) {
    // Overflowed into the following month — step back to the last valid day.
    result.setDate(0);
  }

  return result;
}

/**
 * Resolve a preset to a concrete return date, counted from today.
 */
export function calculateExpectedReturnDate(
  preset: DurationPreset | string
): string {
  const resolved =
    typeof preset === 'string' ? findDurationPreset(preset) : preset;

  if (!resolved) {
    return '';
  }

  const today = getLocalStartOfDay(new Date());

  if (resolved.months) {
    return toDateValue(addMonths(today, resolved.months));
  }

  if (resolved.days) {
    today.setDate(today.getDate() + resolved.days);
    return toDateValue(today);
  }

  return '';
}

/**
 * Map a chosen date back to the preset that produced it, so reopening the form
 * shows "6 months" rather than dropping to Custom.
 *
 * Returns `CUSTOM_DURATION_VALUE` for a valid future date matching no preset,
 * and an empty string when the date is unusable.
 */
export function calculateDurationFromDate(dateValue: string): string {
  const [year, month, day] = dateValue.split('-').map((part) => Number(part));

  if (!year || !month || !day) {
    return '';
  }

  const selectedDate = new Date(year, month - 1, day);

  if (Number.isNaN(selectedDate.getTime())) {
    return '';
  }

  const today = getLocalStartOfDay(new Date());
  const diffDays = Math.round(
    (selectedDate.getTime() - today.getTime()) / DAY_IN_MS
  );

  if (diffDays <= 0) {
    return '';
  }

  const matched = DURATION_OPTIONS.find(
    (option) => calculateExpectedReturnDate(option) === dateValue
  );

  return matched ? matched.value : CUSTOM_DURATION_VALUE;
}

/**
 * Days between today and a return date, for callers that still need a count.
 */
export function daysUntil(dateValue: string): number | null {
  const [year, month, day] = dateValue.split('-').map((part) => Number(part));
  if (!year || !month || !day) return null;

  const selectedDate = new Date(year, month - 1, day);
  if (Number.isNaN(selectedDate.getTime())) return null;

  const today = getLocalStartOfDay(new Date());
  return Math.round((selectedDate.getTime() - today.getTime()) / DAY_IN_MS);
}
