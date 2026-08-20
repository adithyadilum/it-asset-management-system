'use client';

import { useState, useEffect } from 'react';
import { Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DevicePairingModal from '@/components/auth/device-pairing-modal';
import { DevicesList } from '@/components/features/devices/devices-list';
import type { LinkedDevice } from '@/lib/data/devices-repo';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Pusher from 'pusher-js';
import { clientEnv } from '@/lib/env.client';

interface DevicesPageClientProps {
  devices: LinkedDevice[];
}

export function DevicesPageClient({ devices }: DevicesPageClientProps) {
  const [pairingOpen, setPairingOpen] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user?.id) return;

    const pusher = new Pusher(clientEnv.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: clientEnv.NEXT_PUBLIC_PUSHER_CLUSTER!,
      channelAuthorization: {
        endpoint: '/api/v1/pusher/auth',
        transport: 'ajax',
      },
    });

    const channelName = `private-user-${session.user.id}`;
    const channel = pusher.subscribe(channelName);

    channel.bind('devices_updated', () => {
      // Refresh the page data when a device unlinks itself
      router.refresh();
    });

    return () => {
      channel.unbind('devices_updated');
      pusher.unsubscribe(channelName);
      pusher.disconnect();
    };
  }, [session?.user?.id, router]);

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Linked Devices
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage mobile devices linked to your account for asset scanning.
          </p>
        </div>
        <Button onClick={() => setPairingOpen(true)} className="gap-2">
          <Smartphone className="h-4 w-4" />
          Link New Device
        </Button>
      </div>

      <div className="mt-6">
        <DevicesList devices={devices} />
      </div>

      <DevicePairingModal open={pairingOpen} onOpenChange={setPairingOpen} />
    </>
  );
}
