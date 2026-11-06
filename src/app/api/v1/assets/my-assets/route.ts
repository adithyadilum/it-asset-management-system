import { NextResponse } from 'next/server';
import { withMobileAuth } from '@/lib/api/with-auth';
import { canAccessMobile } from '@/lib/auth/roles';
import { getMobileMyAssets } from '@/lib/data/mobile-my-assets-repo';

/** Current user's equipment custody and software seats; no administrative secrets. */
export const GET = withMobileAuth(canAccessMobile, async (_req, { user }) =>
  NextResponse.json(await getMobileMyAssets(user.id), {
    headers: { 'Cache-Control': 'no-store' },
  })
);
