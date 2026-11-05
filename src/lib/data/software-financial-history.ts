import 'server-only';
import type { db } from '@/db';
import { softwareFinancialTerms } from '@/db/schema';
import { addMonths, DAY_MS, reportDate } from '@/lib/reporting-time';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export async function recordInitialSoftwareTerm(
  tx: Transaction,
  input: {
    licenseId: string;
    purchaseId: number;
    amount: string;
    currency: string;
    exchangeRate: string | null;
    licenseType: string;
    seats: number;
    startDate: string;
    expiryDate: string | null;
    allocationLifeMonths?: number | null;
  }
) {
  const from = reportDate(input.startDate);
  const to =
    input.licenseType === 'Perpetual'
      ? input.allocationLifeMonths
        ? addMonths(from, input.allocationLifeMonths)
        : null
      : input.expiryDate
        ? reportDate(input.expiryDate) + DAY_MS
        : input.licenseType === 'Open Source / Free'
          ? addMonths(from, 1200)
          : null;
  // A missing perpetual life or subscription term is an exception to configure,
  // never a guessed expense schedule.
  if (to == null || to <= from) return;
  await tx
    .insert(softwareFinancialTerms)
    .values({
      licenseId: input.licenseId,
      sourcePurchaseId: input.purchaseId,
      amount: input.licenseType === 'Open Source / Free' ? '0' : input.amount,
      currencyCode: input.currency,
      exchangeRate: input.exchangeRate,
      validFrom: new Date(from),
      validTo: new Date(to),
      seats: input.seats,
      allocationLifeMonths:
        input.licenseType === 'Perpetual' ? input.allocationLifeMonths : null,
    });
}
