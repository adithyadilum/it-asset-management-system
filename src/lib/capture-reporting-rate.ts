import 'server-only';
import { fetchLiveExchangeRates } from '@/lib/currency-server';
import { rateFromRecordedResponse } from '@/lib/recorded-money';

export async function captureReportingRate(
  currency: string
): Promise<string | null> {
  if (currency === 'LKR') return '1';
  return rateFromRecordedResponse(
    currency,
    (await fetchLiveExchangeRates()) ?? undefined
  );
}
