import { NextResponse } from 'next/server';
import { withMobileAuth } from '@/lib/api/with-auth';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { canAccessMobile } from '@/lib/auth/roles';
import { getMobileTasks } from '@/lib/data/mobile-operations-repo';
import { mobileTasksQuerySchema } from '@/lib/validations/mobile-operations';

export const GET = withRateLimit(
  'mobile-tasks',
  withMobileAuth(canAccessMobile, async (req, { user }) => {
    const parsed = mobileTasksQuerySchema.safeParse(
      Object.fromEntries(new URL(req.url).searchParams)
    );
    if (!parsed.success)
      return NextResponse.json(
        { error: 'Invalid task filters.' },
        { status: 400 }
      );
    return NextResponse.json(
      await getMobileTasks(parsed.data, user.role === 'GlobalAdmin'),
      { headers: { 'Cache-Control': 'no-store' } }
    );
  })
);
