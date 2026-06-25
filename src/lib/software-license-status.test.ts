import { describe, expect, it } from 'vitest';
import { isSoftwareLicenseNearCapacity } from './software-license-status';

describe('isSoftwareLicenseNearCapacity', () => {
  it('does not warn when no seats are allocated', () => {
    expect(isSoftwareLicenseNearCapacity(1, 1)).toBe(false);
  });

  it('warns at 80% utilization before the license is full', () => {
    expect(isSoftwareLicenseNearCapacity(10, 2)).toBe(true);
  });

  it('does not warn for low utilization even when the absolute available count is small', () => {
    expect(isSoftwareLicenseNearCapacity(3, 2)).toBe(false);
  });

  it('leaves full licenses for the full status instead of warning', () => {
    expect(isSoftwareLicenseNearCapacity(10, 0)).toBe(false);
  });
});
