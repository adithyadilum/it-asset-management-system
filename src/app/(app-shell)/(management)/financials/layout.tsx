import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/actions/auth';

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
