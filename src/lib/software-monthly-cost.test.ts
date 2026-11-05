import { describe, expect, it } from 'vitest';
import { softwareMonthlySeatCost } from './software-monthly-cost';
describe('software dashboard cost estimates', () => {
  const term = {
    amount: '9000',
    currencyCode: 'LKR',
    exchangeRate: '1',
    validFrom: new Date('2026-11-01T00:00:00+05:30'),
    validTo: new Date('2026-12-01T00:00:00+05:30'),
    seats: 3,
  };
  const now = new Date('2026-11-05T00:00:00+05:30');
  it('uses paid monthly coverage rather than treating acquisition price as a monthly rate', () =>
    expect(softwareMonthlySeatCost([term], now)).toBe(3000));
  it('represents absent pricing and overlapping terms as unknown rather than inventing a default price', () => {
    expect(softwareMonthlySeatCost([], now)).toBeNull();
    expect(softwareMonthlySeatCost([term, term], now)).toBeNull();
    expect(
      softwareMonthlySeatCost(
        [{ ...term, exchangeRate: null, currencyCode: 'USD' }],
        now
      )
    ).toBeNull();
  });
});
