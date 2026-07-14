import { serverEnv } from '@/lib/env';
import { clientEnv } from '@/lib/env.client';
import { NextResponse } from 'next/server';
import Pusher from 'pusher';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/get-authenticated-user';

export async function POST(req: Request) {
  const user = await getAuthenticatedUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = user.id;

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
      appId: serverEnv.PUSHER_APP_ID!,
      key: clientEnv.NEXT_PUBLIC_PUSHER_KEY!,
      secret: serverEnv.PUSHER_SECRET!,
      cluster: clientEnv.NEXT_PUBLIC_PUSHER_CLUSTER,
      useTLS: true,
    });

    // Using a private channel format or just a user-specific channel
    await pusher.trigger(`user-${userId}`, 'barcode_scanned', {
      barcode,
    });

    return NextResponse.json({
      success: true,
      message: 'Barcode injected successfully',
    });
  } catch (error) {
    console.error('Failed to trigger Pusher barcode event:', error);
    return NextResponse.json(
      { error: 'Failed to inject barcode' },
      { status: 500 }
    );
  }
}
