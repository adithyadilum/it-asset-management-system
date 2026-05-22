'use server';

import { desc, eq, and, count } from 'drizzle-orm';

import { db } from '@/db';
import { appNotifications } from '@/db/schema';
import { getAuthenticatedUser } from '@/actions/auth';
import { logLatency, startLatencyTimer } from '@/lib/latency';

export async function getUnreadCount() {
  const timer = startLatencyTimer();
  try {
    const user = await getAuthenticatedUser();
    if (!user) return 0;

    const [result] = await db
      .select({ count: count() })
      .from(appNotifications)
      .where(
        and(
          eq(appNotifications.userId, user.id),
          eq(appNotifications.isRead, false)
        )
      );

    return result.count;
  } finally {
    logLatency({ scope: 'ACTION', label: 'notifications.getUnreadCount', startTime: timer });
  }
}

export async function getNotifications(limit = 10, offset = 0) {
  const timer = startLatencyTimer();
  try {
    const user = await getAuthenticatedUser();
    if (!user) return [];

    const data = await db
      .select()
      .from(appNotifications)
      .where(eq(appNotifications.userId, user.id))
      .orderBy(desc(appNotifications.createdAt))
      .limit(limit)
      .offset(offset);

    return data;
  } finally {
    logLatency({ scope: 'ACTION', label: 'notifications.getNotifications', startTime: timer });
  }
}

export async function markAsRead(id: string) {
  const timer = startLatencyTimer();
  try {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error('Unauthorized');

    await db
      .update(appNotifications)
      .set({ isRead: true })
      .where(
        and(
          eq(appNotifications.id, id),
          eq(appNotifications.userId, user.id)
        )
      );
      
    // Usually with server actions it's good to revalidate paths, but if we're using SWR, SWR handles the revalidation. 
  } finally {
    logLatency({ scope: 'ACTION', label: 'notifications.markAsRead', startTime: timer });
  }
}

export async function markAllAsRead() {
  const timer = startLatencyTimer();
  try {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error('Unauthorized');

    await db
      .update(appNotifications)
      .set({ isRead: true })
      .where(
        and(
          eq(appNotifications.userId, user.id),
          eq(appNotifications.isRead, false)
        )
      );
  } finally {
    logLatency({ scope: 'ACTION', label: 'notifications.markAllAsRead', startTime: timer });
  }
}
