/**
 * Display helpers for custom-schema values.
 *
 * A category's `custom_schema` can declare a field as `Boolean`, and what gets
 * stored in `technical_details` / `instance_attributes` is a real JSON boolean.
 * JSX renders `true` and `false` as nothing at all, so a Boolean spec drew its
 * label with an empty space where the value belonged -- "Stand included" with
 * nothing beside it, on every asset that had one.
 *
 * `String(value)` is not the fix either: a spec sheet says Yes and No, not
 * "true" and "false", and that is what the edit form was showing.
 */

/** A value as stored in one of the custom-schema JSON columns. */
export type SpecValue = string | number | boolean | null | undefined;

/** True when the value is worth a row at all. */
export function hasSpecValue(value: SpecValue): boolean {
  return value !== undefined && value !== null && value !== '';
}

/** One value, rendered the way a spec sheet would write it. */
export function formatSpecValue(value: SpecValue): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value === null || value === undefined) return '';
  return String(value);
}
