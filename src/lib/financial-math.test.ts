import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateCurrentBookValue as calculateStraightLineDepreciation,
  calculateMonthsElapsed,
} from './depreciation';

describe('Financial Math Utility', () => {
  beforeEach(() => {
    // Mock current date to a fixed point in time for deterministic tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T00:00:00Z'));
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('calculateMonthsElapsed', () => {
    it('returns 0 for null/undefined dates', () => {
      expect(calculateMonthsElapsed(null)).toBe(0);
      expect(calculateMonthsElapsed('')).toBe(0);
    });

    it('returns 0 for invalid dates', () => {
      expect(calculateMonthsElapsed('invalid-date')).toBe(0);
    });

    it('calculates full months accurately (1 year = 12 months)', () => {
      expect(calculateMonthsElapsed('2023-01-15T00:00:00Z')).toBe(12);
    });

    it('handles same month', () => {
      expect(calculateMonthsElapsed('2024-01-01T00:00:00Z')).toBe(0);
    });
    
    it('handles future dates (returns negative months)', () => {
      expect(calculateMonthsElapsed('2024-02-15T00:00:00Z')).toBe(-1);
    });
  });

  describe('calculateStraightLineDepreciation', () => {
    it('returns 0 when original price is 0 or negative', () => {
      expect(calculateStraightLineDepreciation({ cost: 0, usefulLifeMonths: 60, purchaseDate: '2023-01-15' })).toBe(0);
      expect(calculateStraightLineDepreciation({ cost: -100, usefulLifeMonths: 60, purchaseDate: '2023-01-15' })).toBe(0);
    });

    it('returns original price when purchaseDate is missing or invalid', () => {
      expect(calculateStraightLineDepreciation({ cost: 1000, usefulLifeMonths: 60, purchaseDate: null })).toBe(1000);
      expect(calculateStraightLineDepreciation({ cost: 1000, usefulLifeMonths: 60, purchaseDate: 'invalid' })).toBe(1000);
    });

    it('returns original price when elapsed months is 0 or negative', () => {
      expect(calculateStraightLineDepreciation({ cost: 1000, usefulLifeMonths: 60, purchaseDate: '2024-01-01' })).toBe(1000); // 0 elapsed
      expect(calculateStraightLineDepreciation({ cost: 1000, usefulLifeMonths: 60, purchaseDate: '2024-02-01' })).toBe(1000); // negative elapsed
    });

    it('calculates correct depreciation after 1 year with 5 year default life (60 months)', () => {
      // 1000 base. 60 month life. 12 months elapsed.
      // 1000 / 60 * 12 = 200 depreciated. Remaining = 800.
      expect(calculateStraightLineDepreciation({ cost: 1000, usefulLifeMonths: null, purchaseDate: '2023-01-15' })).toBe(800);
    });

    it('calculates correct depreciation after 1 year with custom 3 year life (36 months)', () => {
      // 1000 base. 36 month life. 12 months elapsed.
      // 1000 / 36 * 12 = 333.33 depreciated. Remaining = 666.67
      expect(calculateStraightLineDepreciation({ cost: 1000, usefulLifeMonths: 36, purchaseDate: '2023-01-15' })).toBeCloseTo(666.67, 1);
    });

    it('floors to 0 when asset is older than useful life', () => {
      // 1000 base. 60 month life. 61 months elapsed (2018-12-15 -> 2024-01-15)
      expect(calculateStraightLineDepreciation({ cost: 1000, usefulLifeMonths: 60, purchaseDate: '2018-12-15' })).toBe(0);
    });
  });
});
