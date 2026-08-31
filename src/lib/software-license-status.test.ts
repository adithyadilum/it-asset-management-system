import { describe, expect, it } from 'vitest';
import {
  isSoftwareLicenseNearCapacity,
  softwareLicenseWarningThreshold,
} from './software-license-status';

describe('softwareLicenseWarningThreshold', () => {
  it('is 10% of the seats, rounded up', () => {
    expect(softwareLicenseWarningThreshold(40)).toBe(4);
    expect(softwareLicenseWarningThreshold(45)).toBe(5);
    expect(softwareLicenseWarningThreshold(10)).toBe(1);
  });

  it('never drops below one seat', () => {
    // 10% of 4 is 0.4. Without the floor a small licence could only ever be
    // available or full, with no warning band between them.
    expect(softwareLicenseWarningThreshold(4)).toBe(1);
    expect(softwareLicenseWarningThreshold(1)).toBe(1);
  });

  it('is zero for a licence with no seats', () => {
    expect(softwareLicenseWarningThreshold(0)).toBe(0);
  });
});

describe('isSoftwareLicenseNearCapacity', () => {
  it('does not warn when no seats are allocated', () => {
    expect(isSoftwareLicenseNearCapacity(1, 1)).toBe(false);
    expect(isSoftwareLicenseNearCapacity(10, 10)).toBe(false);
  });

  it('warns only once 10% or less of the seats remain', () => {
    // A ten-seat licence keeps its status until the last seat is left. Under
    // the old 80%-utilisation rule it warned with two of ten still free.
    expect(isSoftwareLicenseNearCapacity(10, 3)).toBe(false);
    expect(isSoftwareLicenseNearCapacity(10, 2)).toBe(false);
    expect(isSoftwareLicenseNearCapacity(10, 1)).toBe(true);
  });

  it('scales the band with the licence size', () => {
    expect(isSoftwareLicenseNearCapacity(40, 5)).toBe(false);
    expect(isSoftwareLicenseNearCapacity(40, 4)).toBe(true);
    expect(isSoftwareLicenseNearCapacity(100, 11)).toBe(false);
    expect(isSoftwareLicenseNearCapacity(100, 10)).toBe(true);
  });

  it('gives small licences a one-seat warning band', () => {
    expect(isSoftwareLicenseNearCapacity(3, 2)).toBe(false);
    expect(isSoftwareLicenseNearCapacity(3, 1)).toBe(true);
  });

  it('leaves full licenses for the full status instead of warning', () => {
    expect(isSoftwareLicenseNearCapacity(10, 0)).toBe(false);
  });
});
