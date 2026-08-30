import { NextResponse } from 'next/server';
import { unstable_rethrow } from 'next/navigation';
import { db } from '@/db';
import { notificationRules } from '@/db/schema';
import { withSessionAuth } from '@/lib/api/with-auth';
import { canManageAssets } from '@/lib/auth/roles';

export const GET = withSessionAuth(canManageAssets, async () => {
  try {
    const rules = await db
      .select()
      .from(notificationRules)
      .orderBy(notificationRules.id);

    return NextResponse.json(
      {
        success: true,
        data: rules,
      },
      { status: 200 }
    );
  } catch (error) {
    unstable_rethrow(error);
    console.error('GET /api/v1/settings/notification-rules error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
export const POST = withSessionAuth(canManageAssets, async () => {
  try {
    let rules = await db
      .select()
      .from(notificationRules)
      .orderBy(notificationRules.id);

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
        ruleKey: 'RETURN_REQUESTED',
        displayName: 'Asset Return Requested',
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

    const existingKeys = new Set(rules.map((r) => r.ruleKey));
    const missingRules = defaultRules.filter(
      (r) => !existingKeys.has(r.ruleKey)
    );

    if (missingRules.length > 0) {
      const inserted = await db
        .insert(notificationRules)
        .values(
          missingRules.map((rule) => ({
            ...rule,
            updatedAt: new Date(),
          }))
        )
        .returning();

      rules = [...rules, ...inserted].sort((a, b) => a.id - b.id);
    }

    return NextResponse.json(
      {
        success: true,
        data: rules,
      },
      { status: 200 }
    );
  } catch (error) {
    unstable_rethrow(error);
    console.error('POST /api/v1/settings/notification-rules error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
