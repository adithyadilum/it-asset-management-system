import { useEffect } from 'react';
import { clientEnv } from '@/lib/env.client';
import { useSession } from 'next-auth/react';
import Pusher from 'pusher-js';

export function useBarcodeInjection(onInject: (barcode: string) => void) {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;

    // Initialize Pusher
    const pusher = new Pusher(clientEnv.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: clientEnv.NEXT_PUBLIC_PUSHER_CLUSTER,
      // Private channels are authorized server-side; the session cookie rides
      // along with the same-origin request.
      channelAuthorization: {
        endpoint: '/api/v1/pusher/auth',
        transport: 'ajax',
      },
    });

    // Private channel scoped to this user; nobody else can subscribe.
    const channelName = `private-user-${userId}`;
    const channel = pusher.subscribe(channelName);

    // Bind to the barcode scanned event
    channel.bind('barcode_scanned', (data: { barcode: string }) => {
      if (data && data.barcode) {
        onInject(data.barcode);
      }
    });

    return () => {
      channel.unbind('barcode_scanned');
      pusher.unsubscribe(channelName);
      pusher.disconnect();
    };
  }, [userId, onInject]);
}
