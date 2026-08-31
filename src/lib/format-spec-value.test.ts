import { describe, expect, it } from 'vitest';

import { formatSpecValue, hasSpecValue } from './format-spec-value';

describe('formatSpecValue', () => {
  it('writes booleans the way a spec sheet does', () => {
    // The bug this replaces: the value reached the JSX as a real boolean and
    // React renders `true`/`false` as nothing, so "Stand included" drew a
    // label with an empty space beside it on every asset that had one.
    expect(formatSpecValue(true)).toBe('Yes');
    expect(formatSpecValue(false)).toBe('No');
  });

  it('leaves strings and numbers alone', () => {
    expect(formatSpecValue('Intel Core i7-1355U')).toBe('Intel Core i7-1355U');
    expect(formatSpecValue(498)).toBe('498');
    expect(formatSpecValue(0)).toBe('0');
  });

  it('renders nothing for an absent value', () => {
    expect(formatSpecValue(null)).toBe('');
    expect(formatSpecValue(undefined)).toBe('');
  });
});

describe('hasSpecValue', () => {
  it('keeps false, which is a real answer', () => {
    // `false` must survive the filter or "Charger included: No" disappears
    // instead of reading No.
    expect(hasSpecValue(false)).toBe(true);
  });

  it('keeps zero, which is also a real answer', () => {
    expect(hasSpecValue(0)).toBe(true);
  });

  it('drops values with nothing to show', () => {
    expect(hasSpecValue('')).toBe(false);
    expect(hasSpecValue(null)).toBe(false);
    expect(hasSpecValue(undefined)).toBe(false);
  });
});
