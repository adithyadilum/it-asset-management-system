//src/db/seed.notifications.ts
import '../lib/load-env';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { notificationRules } from './schema';
import { serverEnv } from '@/lib/env';

// Load environment variables

const sql = neon(serverEnv.DATABASE_URL);
const db = drizzle(sql);

async function seedNotificationRules() {
  const defaultRules = [
    // HARDWARE_LIFECYCLE
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

    // OPERATIONAL
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

    // SECURITY
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

    // FINANCIAL
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

  console.log('🌱 Seeding notification rules...');

  try {
    for (const rule of defaultRules) {
      await db
        .insert(notificationRules)
        .values({
          ...rule,
          updatedAt: new Date(),
        })
        .onConflictDoNothing();
    }

    console.log('✅ Notification rules seeded successfully');
  } catch (error) {
    console.error('❌ Failed to seed notification rules:', error);
    throw error;
  }
}

seedNotificationRules().catch(console.error);
