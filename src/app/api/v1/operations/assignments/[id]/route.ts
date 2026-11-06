import { after, NextResponse } from 'next/server';
import { withMobileAuth } from '@/lib/api/with-auth';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { canAccessMobile } from '@/lib/auth/roles';
import { mobileAssignmentActionSchema } from '@/lib/validations/mobile-operations';
import { actOnMobileAssignment } from '@/lib/data/mobile-operations-repo';
import {
  invalidateMobileOperations,
  mobileOperationError,
} from '@/lib/api/mobile-operations';
import { dispatchWebhookEvent } from '@/lib/webhooks/dispatcher';
import { dispatchAlert } from '@/lib/notifications/dispatcher';
export const POST = withRateLimit(
  'mobile-assignment-action',
  withMobileAuth<{ params: Promise<{ id: string }> }>(
    canAccessMobile,
    async (req, { user, params }) => {
      const id = Number((await params).id);
      if (!Number.isSafeInteger(id) || id < 1)
        return NextResponse.json(
          { error: 'Invalid assignment.' },
          { status: 400 }
        );
      const parsed = mobileAssignmentActionSchema.safeParse(
        await req.json().catch(() => null)
      );
      if (!parsed.success)
        return NextResponse.json(
          { error: 'Invalid assignment action.' },
          { status: 400 }
        );
      try {
        const result = await actOnMobileAssignment(
          { ...parsed.data, assignmentId: id },
          user.id
        );
        invalidateMobileOperations();
        if (parsed.data.action === 'receive')
          after(() =>
            dispatchWebhookEvent('assignment.returned', {
              assignmentId: id,
              assetId: result.assetId,
              returnedDate: new Date().toISOString(),
            })
          );
        if (parsed.data.action === 'request-return' && result.userId)
          after(() =>
            dispatchAlert({
              eventType: 'RETURN_REQUESTED',
              userId: result.userId!,
              title: 'Return requested',
              message:
                'IT has requested the return of an assigned asset. Open My Assets for details.',
              targetUrl: '/my-assets',
            })
          );
        return NextResponse.json(
          {
            success: true,
            message:
              parsed.data.action === 'receive'
                ? 'Return received. Complete the condition check next.'
                : parsed.data.action === 'remind'
                  ? "Reminder added to the employee's alerts."
                  : 'Return requested.',
          },
          { headers: { 'Cache-Control': 'no-store' } }
        );
      } catch (error) {
        return mobileOperationError(error);
      }
    }
  )
);
