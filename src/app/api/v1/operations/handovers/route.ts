import { after, NextResponse } from 'next/server';
import { withMobileAuth } from '@/lib/api/with-auth';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { canAccessMobile } from '@/lib/auth/roles';
import { mobileHandoverSchema } from '@/lib/validations/mobile-operations';
import { assignSingleAsset } from '@/lib/data/operations-assignments-repo';
import {
  invalidateMobileOperations,
  mobileOperationError,
} from '@/lib/api/mobile-operations';
import { dispatchWebhookEvent } from '@/lib/webhooks/dispatcher';
export const POST = withRateLimit(
  'mobile-handover',
  withMobileAuth(canAccessMobile, async (req, { user }) => {
    const parsed = mobileHandoverSchema.safeParse(
      await req.json().catch(() => null)
    );
    if (!parsed.success)
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid handover.' },
        { status: 400 }
      );
    try {
      const { expectedUpdatedAt, ...input } = parsed.data;
      const result = await assignSingleAsset(input, user.id, {
        expectedUpdatedAt,
        requireAvailable: true,
        afterCommit: after,
      });
      invalidateMobileOperations();
      after(() =>
        dispatchWebhookEvent('assignment.created', {
          ...result.assignments[0],
          assignedById: user.id,
          assignmentType: input.assignmentType,
          assignedToUserId:
            input.assignmentType === 'user' ? input.targetId : null,
          assignedToLocationId:
            input.assignmentType === 'location' ? input.targetId : null,
          expectedReturnDate: input.expectedReturnDate ?? null,
          notes: input.notes ?? null,
        })
      );
      return NextResponse.json(
        {
          success: true,
          assignmentId: result.assignments[0].assignmentId,
          message:
            input.assignmentType === 'user'
              ? 'Handover created. The employee must accept it in My Assets.'
              : 'Location custody recorded.',
        },
        { status: 201, headers: { 'Cache-Control': 'no-store' } }
      );
    } catch (error) {
      return mobileOperationError(error);
    }
  })
);
