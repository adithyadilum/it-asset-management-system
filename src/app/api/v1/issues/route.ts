import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import * as jose from 'jose';
import { db } from '@/db';
import { linkedDevices, maintenanceTickets, assets, assetAssignments, systemAuditLogs } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

const MOBILE_SECRET = new TextEncoder().encode(
  process.env.MOBILE_JWT_SECRET || 'default-fallback-mobile-jwt-secret-key-32bytes-minimum-length-for-hs256'
);

export async function POST(req: Request) {
  let userId: string | null = null;

  // --- 1. Check for Mobile App (Bearer Token) ---
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      // Verify the custom mobile JWT we generated during the QR flow
      const { payload } = await jose.jwtVerify(token, MOBILE_SECRET);

      // Check that the JWT's jti maps to a non-revoked device
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

        // Update lastActiveAt for this device
        await db
          .update(linkedDevices)
          .set({ lastActiveAt: new Date() })
          .where(eq(linkedDevices.id, device.id));
      }

      userId = payload.id as string;
    } catch {
      return NextResponse.json({ error: 'Invalid or Expired Mobile Token' }, { status: 401 });
    }
  } 
  
  // --- 2. Check for Web Dashboard (NextAuth Cookie) ---
  else {
    const session = await getServerSession(authOptions);
    if (session?.user) {
      userId = session.user.id;
    }
  }

  // --- 3. Final Security Check ---
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // --- 4. Execute Business Logic ---
  try {
    const body = await req.json();
    const { assetId, issueNote } = body;

    if (!assetId || !issueNote) {
      return NextResponse.json({ error: 'assetId and issueNote are required' }, { status: 400 });
    }

    const result = await db.transaction(async (tx) => {
      // Fetch the asset
      const [currentAsset] = await tx
        .select()
        .from(assets)
        .where(eq(assets.id, assetId))
        .limit(1);

      if (!currentAsset) {
        throw new Error('Asset not found');
      }

      const now = new Date();

      // Create internal maintenance ticket (this puts it in Pending Review)
      const [newTicket] = await tx.insert(maintenanceTickets).values({
        assetId: currentAsset.id,
        ticketType: 'INTERNAL',
        reportedIssue: issueNote,
        status: 'ACTIVE',
        dispatchedById: userId,
        createdAt: now,
        updatedAt: now,
      }).returning();

      if (!newTicket) {
        throw new Error('Failed to create maintenance ticket');
      }

      // Update asset status to 'In Repair' (removing it from 'Available' assignments grid)
      await tx
        .update(assets)
        .set({ status: 'In Repair', updatedAt: now })
        .where(eq(assets.id, currentAsset.id));

      // Terminate any active assignments since the asset is now In Repair
      await tx
        .update(assetAssignments)
        .set({ returnedDate: now })
        .where(
          and(
            eq(assetAssignments.assetId, currentAsset.id),
            isNull(assetAssignments.returnedDate)
          )
        );

      // Log the audit action
      await tx.insert(systemAuditLogs).values({
        entityType: 'Asset',
        entityId: currentAsset.id,
        actionType: 'UPDATE',
        performedById: userId,
        oldValue: { status: currentAsset.status },
        newValue: {
          status: 'In Repair',
          actionContext: 'ISSUE_REPORTED_FROM_MOBILE',
          issueNote: issueNote,
        },
        performedAt: now,
      });

      return {
        success: true,
        message: 'Issue reported successfully',
        ticketId: newTicket.id,
      };
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error reporting issue:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
