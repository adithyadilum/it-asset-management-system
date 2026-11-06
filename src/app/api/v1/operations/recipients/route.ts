import { NextResponse } from 'next/server';
import { withMobileAuth } from '@/lib/api/with-auth';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { canAccessMobile } from '@/lib/auth/roles';
import { searchMobileRecipients } from '@/lib/data/mobile-operations-repo';
import { mobileRecipientsQuerySchema } from '@/lib/validations/mobile-operations';
export const GET = withRateLimit(
  'mobile-recipients',
  withMobileAuth(canAccessMobile, async (req) => {
    const parsed = mobileRecipientsQuerySchema.safeParse(
      Object.fromEntries(new URL(req.url).searchParams)
    );
    if (!parsed.success)
      return NextResponse.json(
        { error: 'Invalid recipient search.' },
        { status: 400 }
      );
    return NextResponse.json(
      await searchMobileRecipients(parsed.data.type, parsed.data.query),
      { headers: { 'Cache-Control': 'no-store' } }
    );
  })
);
