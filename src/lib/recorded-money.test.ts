import { describe, expect, it } from 'vitest';
import { recordedMoney } from './recorded-money';

describe('recorded transaction costs', () => {
  it('normalizes mixed purchase and repair currencies independently', () => {
    expect(
      recordedMoney('1000', 'USD', '300')! + recordedMoney('3000', 'LKR', null)!
    ).toBe(303000);
  });
  it('preserves zero but flags absent amounts and suspect foreign FX', () => {
    expect(recordedMoney('0', 'LKR', null)).toBe(0);
    for (const rate of [null, 0, 1, -1, 'bad'])
      expect(recordedMoney('100', 'USD', rate)).toBeNull();
    expect(recordedMoney(null, 'LKR', 1)).toBeNull();
    expect(recordedMoney('-1', 'LKR', 1)).toBeNull();
  });
});
