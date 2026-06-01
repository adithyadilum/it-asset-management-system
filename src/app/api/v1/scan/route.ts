import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import * as jose from 'jose';
import { db } from '@/db';
import { linkedDevices } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

const MOBILE_SECRET = new TextEncoder().encode(process.env.MOBILE_JWT_SECRET);

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
  
  // Process the QR scan in your Drizzle database...
  
  return NextResponse.json({ success: true, message: 'Asset Scanned Successfully' });
}