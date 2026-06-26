import { NextResponse } from 'next/server';

/**
 * Standardized API error response formatter.
 * @param status HTTP status code
 * @param code Custom error code string (e.g. 'UNAUTHORIZED')
 * @param message Human-readable error message
 * @param details Optional detailed error object or validation issues
 */
export function apiError(
  status: number,
  code: string,
  message: string,
  details?: unknown
) {
  return NextResponse.json(
    {
      success: false,
      error: { code, message, ...(details ? { details } : {}) },
    },
    { status }
  );
}

/**
 * Parses a string value into an integer bounded by min and max limits.
 * Helpful for pagination parameters.
 * @param value The raw string from searchParams
 * @param defaultValue Fallback if value is missing or empty
 * @param min Minimum allowed value (inclusive)
 * @param max Maximum allowed value (inclusive)
 */
export function parseBoundedInt(
  value: string | null,
  defaultValue: number,
  min: number,
  max: number
) {
  if (value === null || value.trim() === '') {
    return { ok: true as const, value: defaultValue };
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    return { ok: false as const };
  }

  return { ok: true as const, value: parsed };
}
