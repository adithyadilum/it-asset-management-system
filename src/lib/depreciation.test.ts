import { describe, expect, it } from 'vitest';

import {
  calculateStraightLineNBV,
  projectBookValueSeries,
} from '@/lib/depreciation';

function monthsAgo(months: number) {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  date.setDate(1);
  return date;
}

describe('calculateStraightLineNBV', () => {
  it('values an asset as at a date other than today', () => {
    const asset = {
      cost: 1200,
      salvageValue: 0,
      usefulLifeMonths: 12,
      purchaseDate: monthsAgo(12),
    };

    // Today: a year elapsed on a one-year life, so fully written down.
    expect(calculateStraightLineNBV(asset)).toBe(0);

    // Six months ago it was only half depreciated.
    expect(calculateStraightLineNBV(asset, monthsAgo(6))).toBeCloseTo(600, 5);
  });
});

describe('projectBookValueSeries', () => {
  it('spans the requested window, one point per month', () => {
    const series = projectBookValueSeries(
      [
        {
          cost: 1200,
          salvageValue: 0,
          usefulLifeMonths: 24,
          purchaseDate: monthsAgo(6),
        },
      ],
      { monthsBack: 3, monthsForward: 3 }
    );

    expect(series).toHaveLength(7);
    expect(series[0].bookValue).toBeGreaterThan(
      series[series.length - 1].bookValue
    );
  });

  it('excludes assets the company did not own yet', () => {
    const notYetBought = new Date();
    notYetBought.setMonth(notYetBought.getMonth() + 2);

    const series = projectBookValueSeries(
      [
        {
          cost: 5000,
          salvageValue: 0,
          usefulLifeMonths: 60,
          purchaseDate: notYetBought,
        },
      ],
      { monthsBack: 2, monthsForward: 3 }
    );

    // The first three points precede the purchase; without the ownership check
    // they would each carry the asset at its full cost.
    expect(series.slice(0, 3).map((point) => point.bookValue)).toEqual([
      0, 0, 0,
    ]);
    expect(series[series.length - 1].bookValue).toBeGreaterThan(0);
  });

  it('never reports below the salvage floor', () => {
    const series = projectBookValueSeries(
      [
        {
          cost: 1000,
          salvageValue: 250,
          usefulLifeMonths: 6,
          purchaseDate: monthsAgo(24),
        },
      ],
      { monthsBack: 1, monthsForward: 1 }
    );

    for (const point of series) {
      expect(point.bookValue).toBe(250);
    }
  });
});
