import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import * as jose from 'jose';
import { db } from '@/db';
import { linkedDevices } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAssetDetailsById } from '@/lib/data/asset-details-repo';
import { serverEnv } from '@/lib/env';

const MOBILE_SECRET = new TextEncoder().encode(
  serverEnv.MOBILE_JWT_SECRET 
);

function trimTrailingSlashes(value: string) {
  let end = value.length;

  while (end > 0 && value.charCodeAt(end - 1) === 47) {
    end -= 1;
  }

  return value.slice(0, end);
}

export async function POST(req: Request) {
  let userId = null;
  let userRole = null;

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

      userId = payload.id;
      userRole = payload.role;
    } catch {
      return NextResponse.json({ error: 'Invalid or Expired Mobile Token' }, { status: 401 });
    }
  } 
  
  // --- 2. Check for Web Dashboard (NextAuth Cookie) ---
  else {
    const session = await getServerSession(authOptions);
    if (session?.user) {
      userId = session.user.id;
      userRole = session.user.role;
    }
  }

  // --- 3. Final Security Check ---
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // --- 4. Execute Business Logic ---
  console.log(`Scan initiated by user ${userId} with role ${userRole}`);
  
  let assetTag: string | null = null;
  try {
    const body = await req.json();
    let rawTag = body.assetTag;
    if (typeof rawTag === 'string') {
      // If the QR code contains a full URL (e.g. https://.../assets/LAP-001)
      if (rawTag.includes('/assets/')) {
        rawTag = rawTag.split('/assets/').pop()?.split('?')[0] || rawTag;
      }
      // Clean up any trailing slashes or spaces
      assetTag = trimTrailingSlashes(rawTag.trim());
    }
  } catch {
    // ignore
  }

  if (!assetTag) {
    return NextResponse.json({ error: 'Asset tag is required' }, { status: 400 });
  }

  const assetDetails = await getAssetDetailsById(assetTag);

  if (!assetDetails) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }
  
  return NextResponse.json({ 
    success: true, 
    message: 'Asset Scanned Successfully',
    data: assetDetails
  });
}
