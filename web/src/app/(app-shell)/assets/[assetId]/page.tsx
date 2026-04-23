import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { assets, models, categories } from '@/db/schema';
import { isValidUuid } from '@/lib/auth/uuid';

export default async function AssetIdPage({ params }: { params: Promise<{ assetId: string }> }) {
    const { assetId } = await params;
    const resolvedAssetKey = decodeURIComponent(assetId);
    const isUuidKey = isValidUuid(resolvedAssetKey);

    if (!resolvedAssetKey) {
        redirect('/assets');
    }

    const [assetRecord] = await db
        .select({ id: assets.id, pillar: categories.pillar })
        .from(assets)
        .innerJoin(models, eq(assets.modelId, models.id))
        .innerJoin(categories, eq(models.categoryId, categories.id))
        .where(
            isUuidKey
                ? eq(assets.id, resolvedAssetKey)
                : eq(assets.assetTag, resolvedAssetKey)
        )
        .limit(1);

    if (!assetRecord) {
        redirect('/assets');
    }

    let pillarPath = 'hardware';
    if (assetRecord.pillar === 'IT & Digital') pillarPath = 'hardware';
    else if (assetRecord.pillar === 'Software') pillarPath = 'software';
    else if (assetRecord.pillar === 'Office Furniture') pillarPath = 'furniture';
    else if (assetRecord.pillar === 'Office Electronics') pillarPath = 'office-electronics';

    redirect(`/assets/${pillarPath}?panel=record&id=${assetRecord.id}`);
}
