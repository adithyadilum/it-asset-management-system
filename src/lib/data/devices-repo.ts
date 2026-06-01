import { db } from '@/db';
import { linkedDevices } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export type LinkedDevice = typeof linkedDevices.$inferSelect;

/**
 * Fetch all non-revoked devices linked to a user, ordered by most recently linked.
 */
export async function getLinkedDevices(userId: string): Promise<LinkedDevice[]> {
  return db
    .select()
    .from(linkedDevices)
    .where(
      and(
        eq(linkedDevices.userId, userId),
        eq(linkedDevices.isRevoked, false)
      )
    )
    .orderBy(desc(linkedDevices.linkedAt));
}

/**
 * Get count of active (non-revoked) linked devices for a user.
 */
export async function getLinkedDeviceCount(userId: string): Promise<number> {
  const devices = await db
    .select({ id: linkedDevices.id })
    .from(linkedDevices)
    .where(
      and(
        eq(linkedDevices.userId, userId),
        eq(linkedDevices.isRevoked, false)
      )
    );
  return devices.length;
}
