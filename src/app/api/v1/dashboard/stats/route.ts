import { NextResponse } from 'next/server';
import * as jose from 'jose';
import { db } from '@/db';
import {
  assetAssignments,
  linkedDevices,
  softwareAllocations,
  softwareLicenses,
} from '@/db/schema';
import { eq, and, count, inArray, isNull, gte, lte } from 'drizzle-orm';

const MOBILE_SECRET = new TextEncoder().encode(
  process.env.MOBILE_JWT_SECRET ||
    'default-fallback-mobile-jwt-secret-key-32bytes-minimum-length-for-hs256'
);

/**
 * GET /api/v1/dashboard/stats
 *
 * Returns two KPI metrics for the mobile dashboard:
 * - assignedAssets: count of assets currently assigned to (or overdue for) the authenticated user
 * - expiringLicenses: count of software licenses expiring within 14 days for this user
 *
 * Authenticated via mobile JWT (same flow as /api/v1/profile).
 *
 * Response shape:
 * {
 *   data: {
 *     assignedAssets: number;
 *     expiringLicenses: number;
 *   }
 * }
 */
export async function GET(req: Request) {
  // --- 1. Authenticate via mobile JWT ---
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.slice(7).trim();

  let userId: string;
  try {
    const { payload } = await jose.jwtVerify(token, MOBILE_SECRET);

    // Verify the device is still active (not revoked)
    if (payload.jti) {
      const [device] = await db
        .select({ id: linkedDevices.id, isRevoked: linkedDevices.isRevoked })
        .from(linkedDevices)
        .where(
          and(
            eq(linkedDevices.jwtId, payload.jti),
            eq(linkedDevices.isRevoked, false)
          )
        )
        .limit(1);

      if (!device) {
        return NextResponse.json(
          { error: 'Device has been unlinked. Please re-pair your device.' },
          { status: 401 }
        );
      }
    }

    userId = String(payload.id);
  } catch {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // --- 2. Fetch dashboard KPI metrics ---
  try {
    // Count assets currently assigned to or overdue for this user
    const [{ count: assignedAssets }] = await db
      .select({ count: count() })
      .from(assetAssignments)
      .where(
        and(
          eq(assetAssignments.assignedToUserId, userId),
          inArray(assetAssignments.state, ['assigned', 'overdue'])
        )
      );

    // Count software licenses expiring within the next 14 days for this user
    const today = new Date();
    const in14Days = new Date(today);
    in14Days.setDate(today.getDate() + 14);

    const todayStr = today.toISOString().split('T')[0];
    const in14DaysStr = in14Days.toISOString().split('T')[0];

    const [{ count: expiringLicenses }] = await db
      .select({ count: count() })
      .from(softwareAllocations)
      .innerJoin(
        softwareLicenses,
        eq(softwareAllocations.licenseId, softwareLicenses.id)
      )
      .where(
        and(
          eq(softwareAllocations.assignedToUserId, userId),
          isNull(softwareAllocations.revokedAt),
          eq(softwareLicenses.isActive, true),
          gte(softwareLicenses.expiryDate, todayStr),
          lte(softwareLicenses.expiryDate, in14DaysStr)
        )
      );

    return NextResponse.json({
      data: {
        assignedAssets: Number(assignedAssets),
        expiringLicenses: Number(expiringLicenses),
      },
    });
  } catch (error) {
    console.error('[GET /api/v1/dashboard/stats] DB error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
