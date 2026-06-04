import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import * as jose from 'jose';
import Pusher from 'pusher';

const MOBILE_SECRET = new TextEncoder().encode(
  process.env.MOBILE_JWT_SECRET || 'default-fallback-mobile-jwt-secret-key-32bytes-minimum-length-for-hs256'
);

export async function POST(req: Request) {
  let userId = null;

  // --- 1. Check for Mobile App (Bearer Token) ---
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const { payload } = await jose.jwtVerify(token, MOBILE_SECRET);
      userId = payload.id;
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

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // --- 3. Extract payload ---
  let barcode: string | null = null;
  try {
    const body = await req.json();
    if (typeof body.barcode === 'string') {
      barcode = body.barcode.trim();
    }
  } catch {
    // ignore
  }

  if (!barcode) {
    return NextResponse.json({ error: 'Barcode is required' }, { status: 400 });
  }

  // --- 4. Trigger Pusher Event ---
  try {
    const pusher = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      useTLS: true,
    });
    
    // Using a private channel format or just a user-specific channel
    await pusher.trigger(`user-${userId}`, 'barcode_scanned', {
      barcode,
    });
    
    return NextResponse.json({ success: true, message: 'Barcode injected successfully' });
  } catch (error) {
    console.error('Failed to trigger Pusher barcode event:', error);
    return NextResponse.json({ error: 'Failed to inject barcode' }, { status: 500 });
  }
}
