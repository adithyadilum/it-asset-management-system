import { describe, it, expect } from 'vitest';
import { isValidUuid, UUID_PATTERN } from '@/lib/auth/uuid';

describe('isValidUuid', () => {
  it('returns true for a valid v4 UUID (lowercase)', () => {
    expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('returns true for a valid v4 UUID (uppercase)', () => {
    expect(isValidUuid('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
  });

  it('returns true for a mixed-case UUID', () => {
    expect(isValidUuid('550e8400-E29B-41d4-A716-446655440000')).toBe(true);
  });

  it('returns false for an empty string', () => {
    expect(isValidUuid('')).toBe(false);
  });

  it('returns false for a non-string input (number)', () => {
    expect(isValidUuid(12345)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isValidUuid(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isValidUuid(undefined)).toBe(false);
  });

  it('returns false for a malformed UUID (wrong segment length)', () => {
    expect(isValidUuid('550e8400-e29b-41d4-a716-44665544000')).toBe(false); // too short
    expect(isValidUuid('550e8400-e29b-41d4-a716-4466554400000')).toBe(false); // too long
  });

  it('returns false for a UUID with invalid characters', () => {
    expect(isValidUuid('550e8400-e29b-41d4-a716-44665544000g')).toBe(false);
  });

  it('returns false for a UUID missing hyphens', () => {
    expect(isValidUuid('550e8400e29b41d4a716446655440000')).toBe(false);
  });

  it('returns false for random strings', () => {
    expect(isValidUuid('not-a-uuid')).toBe(false);
    expect(isValidUuid('hello world')).toBe(false);
  });
});

describe('UUID_PATTERN regex', () => {
  it('is a valid RegExp', () => {
    expect(UUID_PATTERN).toBeInstanceOf(RegExp);
  });

  it('is case-insensitive (has /i flag)', () => {
    expect(UUID_PATTERN.flags).toContain('i');
  });
});
