import { db } from '@/db';
import { assetDisposals, assets, users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { DisposalsLayout } from '@/components/features/disposals/disposals-layout';

export const metadata = {
  title: 'Disposals | Operations | TIQRI',
};

export default async function DisposalsPage() {
  // Fetch pending requests and join necessary tables
  const pendingData = await db
    .select({
      id: assetDisposals.id,
      assetId: assets.id,
      assetTag: assets.assetTag,
      assetName: assets.name,
      flaggedBy: users.name,
      reason: assetDisposals.reason,
      requestedAt: assetDisposals.requestedAt,
    })
    .from(assetDisposals)
    .innerJoin(assets, eq(assetDisposals.assetId, assets.id))
    .innerJoin(users, eq(assetDisposals.requestedById, users.id))
    .where(eq(assetDisposals.status, 'Pending Approval'))
    .orderBy(desc(assetDisposals.requestedAt));

  return (
    <div className="flex h-full flex-col p-8 bg-white min-h-[calc(100vh-4rem)]">
      <h1 className="text-[28px] font-bold text-slate-900 mb-6">Disposals</h1>
      <DisposalsLayout pendingData={pendingData} />
    </div>
  );
}