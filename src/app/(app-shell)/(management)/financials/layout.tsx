import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/actions/auth';

/**
 * A guard, not a view: it either renders its children or redirects, so there is
 * nothing to stream. Without this the pages beneath it report "uncached data
 * during prerendering" no matter how they are wrapped, because this layout
 * awaits the session before any of them render.
 */
export const instant = false;

export default async function FinancialsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getAuthenticatedUser();

  // If not logged in, bounce to login
  if (!user) {
    redirect('/login');
  }

  // Strict RBAC Guard: Only GlobalAdmin and FinancialAuditor can access
  if (user.role !== 'GlobalAdmin' && user.role !== 'FinancialAuditor') {
    redirect('/403');
  }

  // If authorized, render the financial pages
  return <>{children}</>;
}
