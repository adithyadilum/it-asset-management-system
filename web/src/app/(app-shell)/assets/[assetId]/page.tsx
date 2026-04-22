import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { assets, models, categories } from '@/db/schema';
import { isValidUuid } from '@/lib/uuid';

export default async function AssetIdPage({ params }: { params: Promise<{ assetId: string }> }) {
    const { assetId } = await params;
    
    if (!isValidUuid(assetId)) {
        redirect('/assets');
    }

    const [assetRecord] = await db
        .select({ pillar: categories.pillar })
        .from(assets)
        .innerJoin(models, eq(assets.modelId, models.id))
        .innerJoin(categories, eq(models.categoryId, categories.id))
        .where(eq(assets.id, assetId))
        .limit(1);

    if (!assetRecord) {
        redirect('/assets');
    }

    let pillarPath = 'hardware';
    if (assetRecord.pillar === 'IT & Digital') pillarPath = 'hardware';
    else if (assetRecord.pillar === 'Software') pillarPath = 'software';
    else if (assetRecord.pillar === 'Office Furniture') pillarPath = 'furniture';
    else if (assetRecord.pillar === 'Office Electronics') pillarPath = 'office-electronics';

    redirect(`/assets/${pillarPath}?panel=record&id=${assetId}`);
}
