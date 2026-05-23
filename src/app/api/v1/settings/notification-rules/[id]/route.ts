import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { notificationRules } from '@/db/schema';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';
import { logAuditAction } from '@/lib/audit';
import { updateNotificationRuleSchema } from '@/lib/validations/settings';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();

    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const ruleId = parseInt(id, 10);
    if (isNaN(ruleId)) {
      return NextResponse.json(
        { error: 'Invalid rule ID format' },
        { status: 400 }
      );
    }

    const bodyText = await request.text();
    let bodyJson;
    try {
      bodyJson = JSON.parse(bodyText);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const parsed = updateNotificationRuleSchema.safeParse(bodyJson);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { isEnabled, thresholdDays, channelInApp, channelEmail, channelTeams } = parsed.data;

    // Check if the rule exists and capture its current state for audit logs
    const existingRules = await db
      .select()
      .from(notificationRules)
      .where(eq(notificationRules.id, ruleId))
      .limit(1);

    const existingRule = existingRules[0];
    if (!existingRule) {
      return NextResponse.json(
        { error: 'Notification rule not found' },
        { status: 404 }
      );
    }

    // Perform database update
    const [updatedRule] = await db
      .update(notificationRules)
      .set({
        isEnabled,
        thresholdDays,
        channelInApp,
        channelEmail,
        channelTeams,
        updatedById: user.id,
        updatedAt: new Date(),
      })
      .where(eq(notificationRules.id, ruleId))
      .returning();

    // Log the update action in the system audit logs
    await logAuditAction({
      entityType: 'NotificationRule',
      entityId: String(ruleId),
      actionType: 'UPDATE',
      performedById: user.id,
      oldData: existingRule,
      newData: updatedRule,
    });

    return NextResponse.json(
      {
        success: true,
        data: updatedRule,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('PUT /api/v1/settings/notification-rules/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
