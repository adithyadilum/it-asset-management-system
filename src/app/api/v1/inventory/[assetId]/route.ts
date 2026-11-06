import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { canViewAssetRegistry } from '@/lib/auth/roles';
import { isValidUuid } from '@/lib/auth/uuid';
import { getMobileAssetProfile } from '@/lib/data/mobile-inventory-repo';

export const GET = withRateLimit(
  'asset-profile',
  withAuth<{ params: Promise<{ assetId: string }> }>(
    canViewAssetRegistry,
    async (_req, { params }) => {
      const { assetId } = await params;
      if (!isValidUuid(assetId))
        return NextResponse.json(
          { error: 'Invalid asset identifier' },
          { status: 400 }
        );
      const data = await getMobileAssetProfile(assetId);
      if (!data)
        return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
      return NextResponse.json(
        { data },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }
  )
);
