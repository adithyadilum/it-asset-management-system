import { redirect } from 'next/navigation';

/**
 * Redirect-only, so there is no markup to prerender and nothing to stream. Next
 * reports "Could not validate `instant`" on every visit without this, because
 * the redirect below stops the segment rendering.
 */
export const instant = false;

export default function FinancialsRootPage() {
  // Automatically bounce users to the first ledger when they click the parent folder
  redirect('/financials/depreciation');
}
