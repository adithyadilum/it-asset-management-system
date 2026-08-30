import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CUSTOM_DURATION_VALUE,
  DURATION_OPTIONS,
  addMonths,
  calculateDurationFromDate,
  calculateExpectedReturnDate,
  findDurationPreset,
  isPresetDuration,
  toDateValue,
} from './assignment-date-utils';

// Fixed so "today" cannot drift mid-run and turn a boundary assertion flaky.
const TODAY = new Date(2026, 7, 20); // 2026-08-20, local time

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(TODAY);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('addMonths', () => {
  it('keeps the same day of month', () => {
    expect(toDateValue(addMonths(new Date(2026, 0, 15), 6))).toBe('2026-07-15');
  });

  it('clamps to the end of a shorter target month', () => {
    // Plain Date arithmetic rolls 31 Aug + 6 months through to 3 March, which
    // would silently hand the user a date in the wrong month.
    expect(toDateValue(addMonths(new Date(2026, 7, 31), 6))).toBe('2027-02-28');
  });

  it('handles a leap-year target', () => {
    expect(toDateValue(addMonths(new Date(2027, 7, 31), 6))).toBe('2028-02-29');
  });

  it('crosses a year boundary', () => {
    expect(toDateValue(addMonths(new Date(2026, 10, 20), 12))).toBe(
      '2027-11-20'
    );
  });
});

describe('calculateExpectedReturnDate', () => {
  it('resolves day-based presets', () => {
    expect(calculateExpectedReturnDate('7d')).toBe('2026-08-27');
    expect(calculateExpectedReturnDate('30d')).toBe('2026-09-19');
  });

  it('resolves month-based presets on the calendar, not by 30-day steps', () => {
    expect(calculateExpectedReturnDate('6m')).toBe('2027-02-20');
    expect(calculateExpectedReturnDate('1y')).toBe('2027-08-20');
    expect(calculateExpectedReturnDate('2y')).toBe('2028-08-20');
    expect(calculateExpectedReturnDate('5y')).toBe('2031-08-20');
  });

  it('returns empty for an unknown preset', () => {
    expect(calculateExpectedReturnDate('nonsense')).toBe('');
    expect(calculateExpectedReturnDate(CUSTOM_DURATION_VALUE)).toBe('');
  });
});

describe('calculateDurationFromDate', () => {
  it('maps a date back to the preset that produced it', () => {
    // Round-trip every option, so a new preset cannot be added without the
    // reverse mapping working too.
    for (const option of DURATION_OPTIONS) {
      const date = calculateExpectedReturnDate(option);
      expect(calculateDurationFromDate(date)).toBe(option.value);
    }
  });

  it('reports a future date matching no preset as custom', () => {
    expect(calculateDurationFromDate('2026-09-01')).toBe(CUSTOM_DURATION_VALUE);
  });

  it('rejects today and any past date', () => {
    expect(calculateDurationFromDate('2026-08-20')).toBe('');
    expect(calculateDurationFromDate('2026-08-19')).toBe('');
  });

  it('rejects a malformed value', () => {
    expect(calculateDurationFromDate('')).toBe('');
    expect(calculateDurationFromDate('not-a-date')).toBe('');
  });
});

describe('preset lookup', () => {
  it('recognises every shipped option', () => {
    for (const option of DURATION_OPTIONS) {
      expect(isPresetDuration(option.value)).toBe(true);
      expect(findDurationPreset(option.value)?.label).toBe(option.label);
    }
  });

  it('does not treat custom as a preset', () => {
    expect(isPresetDuration(CUSTOM_DURATION_VALUE)).toBe(false);
    expect(findDurationPreset(CUSTOM_DURATION_VALUE)).toBeUndefined();
  });

  it('offers the long terms the assignment form needs', () => {
    const labels = DURATION_OPTIONS.map((option) => option.label);
    expect(labels).toEqual(
      expect.arrayContaining(['6 months', '1 year', '2 years', '5 years'])
    );
  });
});
