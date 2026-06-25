'use client';

import { createContext, useContext, useState, useTransition } from 'react';
import { setPreferredCurrency } from '@/actions/currency';
import { resolveCurrencyCode, type SupportedCurrency } from '@/lib/currency';

interface CurrencyContextValue {
  currency: SupportedCurrency;
  isPending: boolean;
  setCurrency: (currency: SupportedCurrency) => void;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({
  children,
  initialCurrency,
}: {
  children: React.ReactNode;
  initialCurrency: string;
}) {
  const [currency, setCurrencyState] = useState<SupportedCurrency>(
    resolveCurrencyCode(initialCurrency),
  );
  const [isPending, startTransition] = useTransition();

  const setCurrency = (next: SupportedCurrency) => {
    setCurrencyState(next); // optimistic update — instant UI response
    startTransition(() => setPreferredCurrency(next)); // persist to cookie in background
  };

  return (
    <CurrencyContext value={{ currency, isPending, setCurrency }}>
      {children}
    </CurrencyContext>
  );
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within a CurrencyProvider');
  return ctx;
}
