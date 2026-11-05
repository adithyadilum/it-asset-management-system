import { Suspense } from 'react';
import { getFinancialConfiguration } from '@/actions/financial-configuration';
import { FinancialCostConfiguration } from '@/components/features/financials/financial-cost-configuration';
import { PageSkeleton } from '@/components/shared/page-skeleton';
import { getAuthenticatedUser } from '@/actions/auth';
import { redirect } from 'next/navigation';
import { SESSION_EXPIRED_PATH } from '@/lib/auth/auth-redirect';
export const instant = false;
export const metadata = {
  title: 'Cost Allocation Configuration | Tiqri Assets',
};
async function Content() {
  const user = await getAuthenticatedUser();
  if (!user) redirect(SESSION_EXPIRED_PATH);
  if (user.role !== 'GlobalAdmin') redirect('/403');
  const data = await getFinancialConfiguration();
  return (
    <div className="h-full overflow-y-auto p-6">
      <FinancialCostConfiguration data={data} />
    </div>
  );
}
export default function FinancialConfigurationPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content />
    </Suspense>
  );
}
