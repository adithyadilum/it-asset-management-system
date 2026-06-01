'use client';

import { useState } from 'react';
import { Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DevicePairingModal from '@/components/auth/device-pairing-modal';
import { DevicesList } from '@/components/features/devices/devices-list';
import type { LinkedDevice } from '@/lib/data/devices-repo';

interface DevicesPageClientProps {
  devices: LinkedDevice[];
}

export function DevicesPageClient({ devices }: DevicesPageClientProps) {
  const [pairingOpen, setPairingOpen] = useState(false);

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
