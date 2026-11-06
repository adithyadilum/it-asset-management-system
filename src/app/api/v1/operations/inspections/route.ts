import { NextResponse } from 'next/server';
import { withMobileAuth } from '@/lib/api/with-auth';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { canAccessMobile } from '@/lib/auth/roles';
import { mobileInspectionSchema } from '@/lib/validations/mobile-operations';
import { processAssetReturn } from '@/lib/data/operations-assignments-repo';
import {
  invalidateMobileOperations,
  mobileOperationError,
} from '@/lib/api/mobile-operations';
export const POST = withRateLimit(
  'mobile-inspection',
  withMobileAuth(canAccessMobile, async (req, { user }) => {
    const parsed = mobileInspectionSchema.safeParse(
      await req.json().catch(() => null)
    );
    if (!parsed.success)
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message ?? 'Invalid condition check.',
        },
        { status: 400 }
      );
    try {
      const { expectedUpdatedAt, ...input } = parsed.data;
      await processAssetReturn(input, user.id, { expectedUpdatedAt });
      invalidateMobileOperations();
      return NextResponse.json(
        { success: true, message: 'Condition check recorded.' },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    } catch (error) {
      return mobileOperationError(error);
    }
  })
);
