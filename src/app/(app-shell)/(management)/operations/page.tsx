import { redirect } from 'next/navigation';
import { requirePageAuth } from '@/lib/auth/page-guard';

/**
 * Redirect-only, so there is no markup to prerender and nothing to stream. Next
 * reports "Could not validate `instant`" on every visit without this, because
 * the redirect below stops the segment rendering.
 */
export const instant = false;

export default async function OperationsPage() {
  const user = await requirePageAuth();

  if (user.role === 'FinancialAuditor') {
    redirect('/operations/maintenance');
  }

  redirect('/operations/assignments');
}
