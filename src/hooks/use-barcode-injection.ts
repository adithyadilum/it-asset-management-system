import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Pusher from 'pusher-js';

export function useBarcodeInjection(onInject: (barcode: string) => void) {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;

    // Initialize Pusher
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });

    // Subscribe to user-specific channel
    const channelName = `user-${userId}`;
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
