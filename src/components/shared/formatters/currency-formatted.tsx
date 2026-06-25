'use client';

import { useCurrency } from '@/components/providers/currency-provider';
import type { SupportedCurrency } from '@/lib/currency';

interface CurrencyFormattedProps {
  amount: number | string | null | undefined;
  /** 
   * Optional override. If not provided, it falls back to the globally selected currency.
   */
  currencyCode?: SupportedCurrency;
  /**
   * If true, uses a compact notation (e.g. $1.5K instead of $1,500).
   */
  compact?: boolean;
}

/**
 * Standardized currency rendering component.
 * Automatically aligns with the global currency selector.
 */
export function CurrencyFormatted({
  amount,
  currencyCode,
  compact = false,
}: CurrencyFormattedProps) {
  const globalContext = useCurrency();
  
  if (amount === null || amount === undefined) {
    return <span>-</span>;
  }

  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (Number.isNaN(numericAmount)) {
    return <span>-</span>;
  }

  const activeCurrency = currencyCode || globalContext.currency || 'LKR';

  const formattedValue = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: activeCurrency,
    minimumFractionDigits: compact ? 0 : 2,
    maximumFractionDigits: compact ? 1 : 2,
    notation: compact ? 'compact' : 'standard',
  }).format(numericAmount);

  return <span>{formattedValue}</span>;
}
