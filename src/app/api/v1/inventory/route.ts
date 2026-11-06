import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/with-auth';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { canViewAssetRegistry } from '@/lib/auth/roles';
import { getMobileInventory } from '@/lib/data/mobile-inventory-repo';
import { inventoryQuerySchema } from '@/lib/validations/inventory';

export const GET = withRateLimit(
  'inventory',
  withAuth(canViewAssetRegistry, async (req) => {
    const parsed = inventoryQuerySchema.safeParse(
      Object.fromEntries(new URL(req.url).searchParams)
    );
    if (!parsed.success)
      return NextResponse.json(
        {
          error: 'Invalid inventory filters',
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    return NextResponse.json(await getMobileInventory(parsed.data), {
      headers: { 'Cache-Control': 'no-store' },
    });
  })
);
