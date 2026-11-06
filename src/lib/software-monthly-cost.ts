import { recordedMoney } from '@/lib/recorded-money';
import { addMonths, monthStart } from '@/lib/reporting-time';

/** Monthly estimate for dashboard comparison; ledger expense remains dated. */
export function softwareMonthlySeatCost(
  terms: {
    amount: string | null;
    currencyCode: string;
    exchangeRate: string | null;
    validFrom: Date;
    validTo: Date;
    seats: number;
  }[],
  asOf: Date
): number | null {
  const now = asOf.getTime(),
    start = monthStart(now),
    end = addMonths(start, 1);
  const current = terms.filter(
    (t) => t.validFrom.getTime() <= now && t.validTo.getTime() > now
  );
  if (current.length !== 1 || current[0].seats < 1) return null;
  const term = current[0],
    cost = recordedMoney(term.amount, term.currencyCode, term.exchangeRate);
  if (cost == null) return null;
  const duration = term.validTo.getTime() - term.validFrom.getTime();
  const overlap = Math.max(
    0,
    Math.min(end, term.validTo.getTime()) -
      Math.max(start, term.validFrom.getTime())
  );
  return (cost * overlap) / duration / term.seats;
}
