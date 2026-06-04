import { NextResponse } from 'next/server';
import * as jose from 'jose';
import { db } from '@/db';
import {
  assetAssignments,
  assetDisposals,
  assetPurchases,
  assets,
  linkedDevices,
  softwareLicenses,
} from '@/db/schema';
import { eq, and, count, isNull, gte, lte, ne, sql } from 'drizzle-orm';

const MOBILE_SECRET = new TextEncoder().encode(
  process.env.MOBILE_JWT_SECRET ||
    'default-fallback-mobile-jwt-secret-key-32bytes-minimum-length-for-hs256'
);

/**
 * GET /api/v1/dashboard/stats
 *
 * Returns four system-wide KPI metrics for the mobile dashboard:
 * - pendingDisposals:  count of disposal requests awaiting admin approval
 * - softwareRenewals:  count of active software licenses expiring within 30 days
 * - overdueReturns:    count of assignments past their expected return date
 * - warrantyExpiry:    count of non-disposed assets with warranty expiring within 30 days
 *
 * Authenticated via mobile JWT (same flow as /api/v1/profile).
 *
 * Response shape:
 * {
 *   data: {
 *     pendingDisposals: number;
 *     softwareRenewals: number;
 *     overdueReturns: number;
 *     warrantyExpiry: number;
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

    if (!payload.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } catch {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }

  // --- 2. Fetch dashboard KPI metrics (system-wide) ---
  try {
    const today = new Date();
    const in30Days = new Date(today);
    in30Days.setDate(today.getDate() + 30);

    const todayStr = today.toISOString().split('T')[0];
    const in30DaysStr = in30Days.toISOString().split('T')[0];

    const [
      pendingDisposalsRes,
      softwareRenewalsRes,
      overdueReturnsRes,
      warrantyExpiryRes,
    ] = await Promise.all([
      // 1. Pending Disposals — disposal requests awaiting approval
      db
        .select({ count: count() })
        .from(assetDisposals)
        .where(eq(assetDisposals.status, 'Pending Approval')),

      // 2. Software Renewals — active licenses expiring within 30 days
      db
        .select({ count: count() })
        .from(softwareLicenses)
        .where(
          and(
            eq(softwareLicenses.isActive, true),
            gte(softwareLicenses.expiryDate, todayStr),
            lte(softwareLicenses.expiryDate, in30DaysStr)
          )
        ),

      // 3. Overdue Returns — assignments past expected return date, not yet returned
      db
        .select({ count: count() })
        .from(assetAssignments)
        .where(
          and(
            isNull(assetAssignments.returnedDate),
            sql`${assetAssignments.expectedReturnDate}::date < CURRENT_DATE`
          )
        ),

      // 4. Warranty Expiry — non-archived, non-disposed assets with warranty expiring within 30 days
      db
        .select({ count: count() })
        .from(assetPurchases)
        .innerJoin(assets, eq(assetPurchases.assetId, assets.id))
        .where(
          and(
            eq(assets.isArchived, false),
            ne(assets.status, 'Disposed'),
            gte(assetPurchases.warrantyExpiry, todayStr),
            lte(assetPurchases.warrantyExpiry, in30DaysStr)
          )
        ),
    ]);

    return NextResponse.json({
      data: {
        pendingDisposals: Number(pendingDisposalsRes[0]?.count ?? 0),
        softwareRenewals: Number(softwareRenewalsRes[0]?.count ?? 0),
        overdueReturns: Number(overdueReturnsRes[0]?.count ?? 0),
        warrantyExpiry: Number(warrantyExpiryRes[0]?.count ?? 0),
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
