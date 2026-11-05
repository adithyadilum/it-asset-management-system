import { sql, type SQLWrapper } from 'drizzle-orm';

export function rateFromRecordedResponse(
  currency: string,
  rates?: Record<string, number>
): string | null {
  if (currency === 'LKR') return '1';
  const from = rates?.[currency];
  const to = rates?.LKR;
  return from && to && from > 0 && to > 0 ? (to / from).toFixed(6) : null;
}

/** Historical recognition uses recorded transaction FX, never today's rates. */
export function recordedMoney(
  amount: unknown,
  currency: string | null,
  rate: unknown
): number | null {
  if (amount == null || amount === '') return null;
  const value = Number(amount);
  if (!Number.isFinite(value) || value < 0 || !currency) return null;
  if (currency === 'LKR') return value;
  const fx = Number(rate);
  // Legacy foreign-currency rows defaulted to 1, which is not a verified rate.
  return Number.isFinite(fx) && fx > 0 && fx !== 1 ? value * fx : null;
}

export function recordedMoneySql(
  amount: SQLWrapper,
  currency: SQLWrapper,
  rate: SQLWrapper
) {
  return sql<
    number | null
  >`CASE WHEN ${amount} IS NULL OR ${amount} < 0 THEN NULL WHEN ${currency} = 'LKR' THEN ${amount}::numeric WHEN ${rate} > 0 AND ${rate} <> 1 THEN ${amount}::numeric * ${rate}::numeric ELSE NULL END`;
}
