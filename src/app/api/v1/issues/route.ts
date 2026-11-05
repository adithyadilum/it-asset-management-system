import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { withAuth } from '@/lib/api/with-auth';
import { canManageAssets } from '@/lib/auth/roles';
import { flagForRepairSchema } from '@/lib/validations/maintenance';
import {
  MobileIssueError,
  recordMobileIssue,
} from '@/lib/data/mobile-issues-repo';

export const POST = withRateLimit(
  'issues',
  withAuth(canManageAssets, async (req, { user }) => {
    const parsed = flagForRepairSchema.safeParse(
      await req.json().catch(() => null)
    );
    if (!parsed.success)
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid issue report.' },
        { status: 400 }
      );
    try {
      const result = await recordMobileIssue(
        { ...parsed.data, issueNote: parsed.data.issueNote.trim() },
        user.id
      );
      for (const path of [
        '/assets',
        '/operations/maintenance',
        '/my-assets',
        '/dashboard',
        '/financials/per-head',
      ])
        revalidatePath(path);
      revalidateTag('dashboard-kpis', 'max');
      return NextResponse.json(result);
    } catch (error) {
      if (error instanceof MobileIssueError)
        return NextResponse.json(
          { error: error.message },
          { status: error.status }
        );
      console.error('Failed to record mobile issue:', error);
      return NextResponse.json(
        { error: 'Could not record the issue. Please try again.' },
        { status: 500 }
      );
    }
  })
);
