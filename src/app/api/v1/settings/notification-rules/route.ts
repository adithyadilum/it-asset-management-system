import { NextResponse } from 'next/server';
import { db } from '@/db';
import { notificationRules } from '@/db/schema';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';
import { canManageAssets } from '@/lib/auth/roles';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canManageAssets(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      );
    }

    let rules = await db
      .select()
      .from(notificationRules)
      .orderBy(notificationRules.id);

    if (rules.length === 0) {
      const defaultRules = [
        {
          ruleKey: 'WARRANTY_EXPIRY_WARNING',
          displayName: 'Warranty Expiry Warning',
          category: 'HARDWARE_LIFECYCLE' as const,
          isEnabled: true,
          thresholdDays: 30,
          channelInApp: true,
          channelEmail: true,
          channelTeams: false,
        },
        {
          ruleKey: 'SOFTWARE_LICENSE_RENEWAL',
          displayName: 'Software License Renewal',
          category: 'HARDWARE_LIFECYCLE' as const,
          isEnabled: true,
          thresholdDays: 30,
          channelInApp: true,
          channelEmail: true,
          channelTeams: true,
        },
        {
          ruleKey: 'RETURN_OVERDUE',
          displayName: 'Asset Return Overdue',
          category: 'OPERATIONAL' as const,
          isEnabled: true,
          thresholdDays: 0,
          channelInApp: true,
          channelEmail: true,
          channelTeams: true,
        },
        {
          ruleKey: 'MAINTENANCE_COMPLETED',
          displayName: 'Maintenance Ticket Completed',
          category: 'OPERATIONAL' as const,
          isEnabled: true,
          thresholdDays: null,
          channelInApp: true,
          channelEmail: true,
          channelTeams: false,
        },
        {
          ruleKey: 'ASSIGNMENT_PENDING',
          displayName: 'Pending Asset Assignment',
          category: 'OPERATIONAL' as const,
          isEnabled: true,
          thresholdDays: null,
          channelInApp: true,
          channelEmail: true,
          channelTeams: false,
        },
        {
          ruleKey: 'UPCOMING_RETURN',
          displayName: 'Upcoming Asset Return',
          category: 'OPERATIONAL' as const,
          isEnabled: true,
          thresholdDays: 14,
          channelInApp: true,
          channelEmail: true,
          channelTeams: false,
        },
        {
          ruleKey: 'PENDING_ACCEPTANCE',
          displayName: 'Pending Asset Acceptance',
          category: 'OPERATIONAL' as const,
          isEnabled: true,
          thresholdDays: null,
          channelInApp: true,
          channelEmail: true,
          channelTeams: false,
        },
        {
          ruleKey: 'DISPOSAL_REQUEST',
          displayName: 'Disposal Request Initiated',
          category: 'SECURITY' as const,
          isEnabled: true,
          thresholdDays: null,
          channelInApp: true,
          channelEmail: true,
          channelTeams: true,
        },
        {
          ruleKey: 'DISPOSAL_APPROVED',
          displayName: 'Disposal Request Approved',
          category: 'SECURITY' as const,
          isEnabled: true,
          thresholdDays: null,
          channelInApp: true,
          channelEmail: true,
          channelTeams: true,
        },
        {
          ruleKey: 'ASSET_DEFECTIVE_REPORTED',
          displayName: 'Asset Defect Reported',
          category: 'SECURITY' as const,
          isEnabled: true,
          thresholdDays: null,
          channelInApp: true,
          channelEmail: true,
          channelTeams: true,
        },
        {
          ruleKey: 'DISPOSAL_REJECTED',
          displayName: 'Disposal Request Rejected',
          category: 'FINANCIAL' as const,
          isEnabled: true,
          thresholdDays: null,
          channelInApp: true,
          channelEmail: true,
          channelTeams: false,
        },
        {
          ruleKey: 'ROLE_CHANGE',
          displayName: 'User Role Changed',
          category: 'FINANCIAL' as const,
          isEnabled: true,
          thresholdDays: null,
          channelInApp: true,
          channelEmail: true,
          channelTeams: false,
        },
      ];

      await db
        .insert(notificationRules)
        .values(
          defaultRules.map((rule) => ({
            ...rule,
            updatedAt: new Date(),
          }))
        )
        .onConflictDoNothing();

      rules = await db
        .select()
        .from(notificationRules)
        .orderBy(notificationRules.id);
    }

    return NextResponse.json(
      {
        success: true,
        data: rules,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/v1/settings/notification-rules error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
