import { requirePageAuth } from '@/lib/auth/page-guard';
import { getLinkedDevices } from '@/lib/data/devices-repo';
import { DevicesPageClient } from '@/components/features/devices/devices-page-client';

export default async function LinkedDevicesPage() {
  const user = await requirePageAuth((role) => role === 'GlobalAdmin');

  const devices = await getLinkedDevices(user.id);

  return (
    <div className="flex flex-1 flex-col p-4 md:p-6 min-h-0">
      <DevicesPageClient devices={devices} />
    </div>
  );
}
