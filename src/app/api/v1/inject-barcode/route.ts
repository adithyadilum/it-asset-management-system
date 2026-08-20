import { withRateLimit } from '@/lib/api/with-rate-limit';
import { NextResponse } from 'next/server';
import { getPusherServerClient } from '@/lib/pusher-server';
import { allowAnyRole, withAuth } from '@/lib/api/with-auth';

// The Pusher channel is a private channel scoped to the caller's own user id,
// so every authenticated role may inject a barcode into their own scanner
// session and no one else can subscribe to it.
export const POST = withRateLimit(
  'inject-barcode',
  withAuth(allowAnyRole, async (req, { user }) => {
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
      return NextResponse.json(
        { error: 'Barcode is required' },
        { status: 400 }
      );
    }

    // --- 4. Trigger Pusher Event ---
    try {
      const pusher = getPusherServerClient();
      if (!pusher) {
        return NextResponse.json(
          { error: 'Realtime delivery is not configured' },
          { status: 503 }
        );
      }

      // User-scoped channel: a barcode only reaches the session that scanned it.
      await pusher.trigger(`private-user-${userId}`, 'barcode_scanned', {
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
  })
);
