import { redirect } from 'next/navigation';
import { requirePageAuth } from '@/lib/auth/page-guard';

export default async function OperationsPage() {
  const user = await requirePageAuth();

  if (user.role === 'FinancialAuditor') {
    redirect('/operations/maintenance');
  }

  redirect('/operations/assignments');
}
