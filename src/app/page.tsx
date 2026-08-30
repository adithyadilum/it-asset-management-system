import { redirect } from 'next/navigation';

/**
 * This route exists only to redirect, so there is no markup to prerender.
 * Without it Next reports "Could not validate `instant`" on every visit,
 * because the NEXT_REDIRECT thrown below stops the segment rendering.
 */
export const instant = false;

export default function RootPage() {
  // Automatically bounce users from the root URL to your default app page
  redirect('/dashboard');
}
