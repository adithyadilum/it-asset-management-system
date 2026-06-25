export const SUPPORTED_CURRENCIES = [
  'LKR',
  'USD',
  'NOK',
] as const;

const USD_EXCHANGE_RATE_BY_CURRENCY: Record<SupportedCurrency, number> = {
  USD: 1,
  NOK: 0.094,
  LKR: 0.0033,
};

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export function isSupportedCurrency(
  currency: string
): currency is SupportedCurrency {
  return SUPPORTED_CURRENCIES.includes(currency as SupportedCurrency);
}

export function resolveCurrencyCode(currency: string): SupportedCurrency {
  return isSupportedCurrency(currency) ? currency : 'LKR';
}

export function getCurrencySymbol(currency: string): string {
  switch (currency) {
    case 'USD':
      return '$';
    case 'NOK':
      return 'kr';
    case 'LKR':
    default:
      return currency;
  }
}

export function parseCurrencyAmount(value: string | number | null | undefined) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (!value) {
    return 0;
  }

  const normalizedValue = String(value).replace(/,/g, '').trim();
  const parsedValue = Number.parseFloat(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

export function tryParseCurrencyAmount(
  value: string | number | null | undefined
) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (value === null || value === undefined) {
    return null;
  }

  const normalizedValue = String(value).replace(/,/g, '').trim();
  if (normalizedValue.length === 0 || normalizedValue === '-') {
    return null;
  }

  const parsedValue = Number.parseFloat(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

export function convertCurrencyAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  apiRates?: Record<string, number>
) {
  const resolvedFromCurrency = resolveCurrencyCode(fromCurrency);
  const resolvedToCurrency = resolveCurrencyCode(toCurrency);

  if (resolvedFromCurrency === resolvedToCurrency) {
    return amount;
  }

  if (apiRates) {
     const fromRate = apiRates[resolvedFromCurrency];
     const toRate = apiRates[resolvedToCurrency];
     if (fromRate && toRate) {
       // API provides rates as 1 USD = X Currency
       const amountInUsd = amount / fromRate;
       return amountInUsd * toRate;
     }
  }

  const fromRate = USD_EXCHANGE_RATE_BY_CURRENCY[resolvedFromCurrency];
  const toRate = USD_EXCHANGE_RATE_BY_CURRENCY[resolvedToCurrency];
  const amountInUsd = amount * fromRate;

  return amountInUsd / toRate;
}

export function formatMoneyByCurrency(
  value: string | number | null | undefined,
  currency: string
) {
  if (
    value === null ||
    value === undefined ||
    String(value).trim().length === 0
  ) {
    return '-';
  }

  const parsedValue = parseCurrencyAmount(value);
  const resolvedCurrency = resolveCurrencyCode(currency);

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: resolvedCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(parsedValue);
  } catch {
    return `${resolvedCurrency} ${parsedValue.toFixed(2)}`;
  }
}

export function formatCurrencySymbol(currency: string) {
  const resolvedCurrency = resolveCurrencyCode(currency);

  if (resolvedCurrency === 'USD') {
    return '$';
  }

  if (resolvedCurrency === 'LKR') {
    return 'Rs';
  }

  if (resolvedCurrency === 'NOK') {
    return 'kr';
  }

  if (resolvedCurrency === 'GBP') {
    return '£';
  }

  if (resolvedCurrency === 'EUR') {
    return '€';
  }

  return resolvedCurrency;
}
