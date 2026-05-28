'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function setPreferredCurrency(currencyCode: string) {
  const cookieStore = await cookies();
  cookieStore.set('preferred_currency', currencyCode, { path: '/' });
  revalidatePath('/', 'layout');
}
