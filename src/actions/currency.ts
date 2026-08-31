'use server';

import { cookies } from 'next/headers';

import { isSupportedCurrency } from '@/lib/currency';

/**
 * Stores the viewer's display currency.
 *
 * The value is checked against the supported set rather than trusted: this is
 * a server action, so the argument is whatever the caller sent, and it is read
 * back on later requests and passed around as a currency code. Rendering
 * survives a bad value -- `resolveCurrencyCode` falls back to LKR -- but there
 * is no reason to persist junk in the first place.
 *
 * Read only by server components, never `document.cookie`, so `httpOnly` costs
 * nothing here.
 */
export async function setPreferredCurrency(currencyCode: string) {
  if (!isSupportedCurrency(currencyCode)) return;

  const cookieStore = await cookies();
  cookieStore.set('preferred_currency', currencyCode, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365,
  });
}
