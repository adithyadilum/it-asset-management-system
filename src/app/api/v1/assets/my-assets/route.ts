import { NextResponse } from 'next/server';
import * as jose from 'jose';
import { db } from '@/db';
import {
  assets,
  assetAssignments,
  categories,
  linkedDevices,
  locations,
  models,
  users,
} from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

if (!process.env.MOBILE_JWT_SECRET) {
  throw new Error('MOBILE_JWT_SECRET environment variable is required');
}
const MOBILE_SECRET = new TextEncoder().encode(process.env.MOBILE_JWT_SECRET);

/**
 * Maps a backend asset status string to the mobile enum value.
 * The mobile app uses lowercase snake_case for statuses.
 */
function mapStatus(
  status: string
): 'assigned' | 'repair' | 'lost' | 'disposed' | 'new' {
  switch (status) {
    case 'Assigned':
      return 'assigned';
    case 'In Repair':
      return 'repair';
    case 'Lost':
      return 'lost';
    case 'Disposed':
    case 'Pending Disposal':
      return 'disposed';
    case 'Available':
    case 'New':
    default:
      return 'new';
  }
}

/**
 * GET /api/v1/assets/my-assets
 *
 * Returns all non-returned asset assignments for the authenticated mobile user.
 *
 * Response shape:
 * {
 *   data: Array<{
 *     id: string;           // asset UUID
 *     assignmentId: number; // assignment row id
 *     name: string;
 *     tagId: string;
 *     status: 'assigned' | 'repair' | 'lost' | 'disposed' | 'new';
 *     state: string;        // raw assignment state e.g. 'pending approval'
 *     category?: string;
 *     pillar?: string;
 *     assignedDate?: string; // ISO string
 *     expectedReturnDate?: string; // ISO date (YYYY-MM-DD)
 *     location?: string;
 *     assignedByName?: string;
 *     condition?: string;
 *   }>
 * }
 *
 * Authentication: Bearer JWT (mobile token issued during QR pairing).
 * Uses the exact same auth pattern as /api/v1/activity/recent.
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

    if (!payload.jti) {
      return NextResponse.json(
        { error: 'Invalid token: missing jti' },
        { status: 401 }
      );
    }

    // Verify the device is still active (not revoked)
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

    userId = typeof payload.id === 'string' && payload.id ? payload.id : '';
  } catch {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // --- 2. Fetch all non-returned assignments for this user ---
  try {
    const rows = await db
      .select({
        // Assignment
        assignmentId: assetAssignments.id,
        assignedDate: assetAssignments.assignedDate,
        expectedReturnDate: assetAssignments.expectedReturnDate,
        state: assetAssignments.state,
        condition: assets.condition,
        // Asset
        assetId: assets.id,
        assetTag: assets.assetTag,
        assetName: assets.name,
        assetStatus: assets.status,
        // Category (via model)
        categoryName: categories.name,
        pillar: categories.pillar,
        // Location
        locationName: locations.name,
        // Assigned by user
        assignedByName: users.name,
      })
      .from(assetAssignments)
      .innerJoin(assets, eq(assetAssignments.assetId, assets.id))
      .innerJoin(models, eq(assets.modelId, models.id))
      .innerJoin(categories, eq(models.categoryId, categories.id))
      .leftJoin(locations, eq(assets.locationId, locations.id))
      .leftJoin(users, eq(assetAssignments.assignedById, users.id))
      .where(
        and(
          eq(assetAssignments.assignedToUserId, userId),
          isNull(assetAssignments.returnedDate)
        )
      );

    const data = rows.map((row) => ({
      id: row.assetId,
      assignmentId: row.assignmentId,
      name: row.assetName ?? row.assetTag,
      tagId: row.assetTag,
      status: mapStatus(row.assetStatus),
      state: row.state,
      category: row.categoryName ?? undefined,
      pillar: row.pillar ?? undefined,
      assignedDate: row.assignedDate?.toISOString() ?? undefined,
      expectedReturnDate: row.expectedReturnDate ?? undefined,
      location: row.locationName ?? undefined,
      assignedByName: row.assignedByName ?? undefined,
      condition: row.condition ?? undefined,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[GET /api/v1/assets/my-assets] DB error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
