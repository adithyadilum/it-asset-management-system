import { getAuthenticatedUser } from '@/actions/auth';
import { getLinkedDevices } from '@/lib/data/devices-repo';
import { DevicesPageClient } from '@/components/features/devices/devices-page-client';

export default async function LinkedDevicesPage() {
  const user = await getAuthenticatedUser();

  if (!user || user.role !== 'GlobalAdmin') {
    return (
      <div className="p-4 md:p-6 text-sm text-muted-foreground">
        You do not have permission to view this page.
      </div>
    );
  }

  const devices = await getLinkedDevices(user.id);

  return (
    <div className="flex flex-1 flex-col p-4 md:p-6 min-h-0">
      <DevicesPageClient devices={devices} />
    </div>
  );
}
