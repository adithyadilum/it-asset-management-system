import { redirect } from 'next/navigation';

/**
 * Redirect-only, so there is no markup to prerender and nothing to stream. Next
 * reports "Could not validate `instant`" on every visit without this, because
 * the redirect below stops the segment rendering.
 */
export const instant = false;

export default function SettingsPage() {
  redirect('/settings/master-data');
}
