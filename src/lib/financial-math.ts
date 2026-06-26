/**
 * @file financial-math.ts
 *
 * @deprecated
 * This file is kept for backwards compatibility only.
 * New code should import directly from `@/lib/depreciation`.
 *
 * All functions here delegate to the canonical implementation in `depreciation.ts`.
 */

export {
  calculateMonthsElapsed,
  calculateCurrentBookValue as calculateStraightLineDepreciation,
  DEFAULT_USEFUL_LIFE_MONTHS,
} from '@/lib/depreciation';
