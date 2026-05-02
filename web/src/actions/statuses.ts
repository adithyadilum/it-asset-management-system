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
  color: string;
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
        color: customStatuses.color,
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

export async function createCustomStatus(name: string, color: string) {
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
        color: color || '#CCCCCC',
        createdById: user.id,
      })
      .returning({
        id: customStatuses.id,
        name: customStatuses.name,
        color: customStatuses.color,
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
      .select({ name: customStatuses.name, color: customStatuses.color })
      .from(customStatuses)
      .where(eq(customStatuses.isActive, true));

    const builtInOptions = MANUAL_OVERRIDE_STATUSES.map((s) => ({
      value: s,
      label: s,
    }));
    const customOptions = customRows.map((r) => ({
      value: r.name,
      label: r.name,
      color: r.color,
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
