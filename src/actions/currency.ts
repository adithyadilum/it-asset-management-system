'use server';

import { cookies } from 'next/headers';

export async function setPreferredCurrency(currencyCode: string) {
  const cookieStore = await cookies();
  cookieStore.set('preferred_currency', currencyCode, { path: '/' });
}
