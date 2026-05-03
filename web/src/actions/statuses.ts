'use server';

import { db } from '@/db';
import { customStatuses } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';
import { logLatency, startLatencyTimer } from '@/lib/latency';
import { MANUAL_OVERRIDE_STATUSES } from '@/lib/constants';

export interface CustomStatusRow {
  id: number;
  name: string;
  iconName: string;
  colorTheme: string;
  isActive: boolean;
  createdAt: Date;
}

export async function getCustomStatuses(): Promise<CustomStatusRow[]> {
  const timer = startLatencyTimer();
  try {
    const rows = await db
      .select({
        id: customStatuses.id,
        name: customStatuses.name,
        iconName: customStatuses.iconName,
        colorTheme: customStatuses.colorTheme,
        isActive: customStatuses.isActive,
        createdAt: customStatuses.createdAt,
      })
      .from(customStatuses)
      .orderBy(customStatuses.createdAt);

    return rows;
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'statuses.getCustomStatuses',
      startTime: timer,
    });
  }
}

export async function createCustomStatus(name: string, colorTheme: string, iconName: string) {
  const timer = startLatencyTimer();
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('UNAUTHENTICATED');
  if (user.role !== 'GlobalAdmin') throw new Error('FORBIDDEN');

  const normalized = name?.trim();
  if (!normalized) throw new Error('Name is required');

  try {
    const inserted = await db
      .insert(customStatuses)
      .values({
        name: normalized,
        colorTheme: colorTheme || 'gray',
        iconName: iconName || 'CircleDot',
        createdById: user.id,
      })
      .returning({
        id: customStatuses.id,
        name: customStatuses.name,
        colorTheme: customStatuses.colorTheme,
        iconName: customStatuses.iconName,
        isActive: customStatuses.isActive,
        createdAt: customStatuses.createdAt,
      });

    return inserted[0];
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'statuses.createCustomStatus',
      startTime: timer,
    });
  }
}

export async function deleteCustomStatus(id: number) {
  const timer = startLatencyTimer();
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('UNAUTHENTICATED');
  if (user.role !== 'GlobalAdmin') throw new Error('FORBIDDEN');

  try {
    await db.delete(customStatuses).where(eq(customStatuses.id, id));
    return { success: true } as const;
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'statuses.deleteCustomStatus',
      startTime: timer,
    });
  }
}

export async function getManualOverrideStatuses() {
  const timer = startLatencyTimer();
  try {
    // Fetch active custom statuses from master data
    const customRows = await db
      .select({ 
        name: customStatuses.name, 
        colorTheme: customStatuses.colorTheme, 
        iconName: customStatuses.iconName 
      })
      .from(customStatuses)
      .where(eq(customStatuses.isActive, true));

    const builtInOptions = MANUAL_OVERRIDE_STATUSES.map((s) => ({
      value: s,
      label: s,
    }));
    const customOptions = customRows.map((r) => ({
      value: r.name,
      label: r.name,
      colorTheme: r.colorTheme,
      iconName: r.iconName,
    }));

    return [...builtInOptions, ...customOptions];
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'statuses.getManualOverrideStatuses',
      startTime: timer,
    });
  }
}
