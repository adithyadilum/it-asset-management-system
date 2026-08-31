import { describe, expect, it } from 'vitest';

import {
  calculateStraightLineNBV,
  projectBookValueSeries,
  straightLineNbvSqlFragment,
} from '@/lib/depreciation';

function monthsAgo(months: number) {
  const date = new Date();
  // Day first, month second. The other order overflows whenever today is the
  // 29th-31st and the target month is shorter: run on 30 August and
  // `setMonth(February)` rolls into March, so `monthsAgo(6)` was really seven
  // months back and the asset measured 500 rather than 600.
  date.setDate(1);
  date.setMonth(date.getMonth() - months);
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

describe('non-depreciable pillars', () => {
  const licence = {
    cost: 1200,
    salvageValue: 0,
    usefulLifeMonths: 12,
    purchaseDate: monthsAgo(24),
  };

  it('carries software at cost however long it has been held', () => {
    // Two years into a one-year life, anything depreciable is fully written
    // down. A licence is a right to use, not a wasting asset.
    expect(calculateStraightLineNBV({ ...licence })).toBe(0);
    expect(calculateStraightLineNBV({ ...licence, pillar: 'Software' })).toBe(
      1200
    );
  });

  it('still depreciates the physical pillars', () => {
    for (const pillar of ['Hardware', 'Office Furniture', 'Office Electronics'])
      expect(calculateStraightLineNBV({ ...licence, pillar })).toBe(0);
  });

  it('emits a CASE for the non-depreciable pillars when given a pillar column', () => {
    const withPillar = straightLineNbvSqlFragment(
      'total_cost',
      'exchange_rate',
      'salvage_value',
      'useful_life_months',
      'purchase_date',
      undefined,
      'categories.pillar'
    );
    expect(withPillar).toContain("categories.pillar IN ('Software')");

    // Without the column every row depreciates, for sets already filtered.
    const withoutPillar = straightLineNbvSqlFragment(
      'total_cost',
      'exchange_rate',
      'salvage_value',
      'useful_life_months',
      'purchase_date'
    );
    expect(withoutPillar).not.toContain('CASE WHEN');
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

  it('never rises from one month to the next', () => {
    // An asset bought partway through this month used to be dropped from the
    // current point and reappear at full cost the month after, so the line
    // dipped at today and jumped back up.
    const midThisMonth = new Date();
    midThisMonth.setDate(15);

    const series = projectBookValueSeries(
      [
        {
          cost: 2400,
          salvageValue: 0,
          usefulLifeMonths: 24,
          purchaseDate: midThisMonth,
        },
      ],
      { monthsBack: 2, monthsForward: 3 }
    );

    // Index 2 is the current month: owned since the 15th, no whole month
    // elapsed, so still at cost -- not the 0 the exact-date comparison gave.
    expect(series[2].bookValue).toBe(2400);

    // And from acquisition onward it only falls.
    for (let i = 3; i < series.length; i += 1) {
      expect(series[i].bookValue).toBeLessThanOrEqual(series[i - 1].bookValue);
    }
  });
});
