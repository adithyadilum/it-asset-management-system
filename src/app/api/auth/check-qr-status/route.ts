import { withRateLimit } from '@/lib/api/with-rate-limit';
import { NextResponse } from 'next/server';
import { pairingDeviceId } from '@/lib/auth/pairing-store';
import { db } from '@/db';
import { linkedDevices } from '@/db/schema';
import { and, eq, gte } from 'drizzle-orm';
import { readDatabase } from '@/lib/database-recovery';

export const GET = withRateLimit('qr-status', async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
    return NextResponse.json({ claimed: false }, { status: 400 });
  }

  // Only a recently committed, active device confirms pairing. Token expiry or
  // consumption alone never counts as success, and a delayed audit cannot block it.
  try {
    const [device] = await readDatabase(() =>
      db
        .select({ id: linkedDevices.id })
        .from(linkedDevices)
        .where(
          and(
            eq(linkedDevices.jwtId, pairingDeviceId(token)),
            eq(linkedDevices.isRevoked, false),
            gte(linkedDevices.linkedAt, new Date(Date.now() - 120_000))
          )
        )
        .limit(1)
    );
    return NextResponse.json(
      { claimed: Boolean(device) },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json(
      { error: 'Pairing confirmation is temporarily unavailable.' },
      {
        status: 503,
        headers: { 'Retry-After': '5', 'Cache-Control': 'no-store' },
      }
    );
  }
});
