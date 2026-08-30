import 'server-only';
import { unstable_cache } from 'next/cache';

const getCachedExchangeRates = unstable_cache(
  async (): Promise<Record<string, number> | null> => {
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');

      if (!res.ok) {
        return null;
      }

      const data = await res.json();
      return data.rates as Record<string, number>;
    } catch (error) {
      console.error('Failed to fetch exchange rates:', error);
      return null;
    }
  },
  ['live-exchange-rates-usd'],
  {
    revalidate: 86400, // 24 hours
    tags: ['exchange-rates'],
  }
);

export async function fetchLiveExchangeRates(): Promise<Record<
  string,
  number
> | null> {
  return getCachedExchangeRates();
}
