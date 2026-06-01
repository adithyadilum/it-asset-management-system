'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Smartphone,
  Monitor,
  Tablet,
  Clock,
  CalendarDays,
  Unlink,
  Loader2,
  SmartphoneNfc,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { tiqriToast } from '@/components/shared/sonner';
import type { LinkedDevice } from '@/lib/data/devices-repo';

interface DevicesListProps {
  devices: LinkedDevice[];
}

function getDeviceIcon(deviceOs: string | null) {
  if (!deviceOs) return Smartphone;
  const os = deviceOs.toLowerCase();
  if (os.includes('ipad') || os.includes('tablet') || os.includes('android tablet')) return Tablet;
  if (os.includes('windows') || os.includes('macos') || os.includes('linux')) return Monitor;
  return Smartphone;
}

function getOsBadgeColor(deviceOs: string | null) {
  if (!deviceOs) return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
  const os = deviceOs.toLowerCase();
  if (os.includes('ios') || os.includes('iphone') || os.includes('ipad'))
    return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
  if (os.includes('android'))
    return 'bg-green-500/10 text-green-600 dark:text-green-400';
  return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
}

function formatRelativeTime(date: Date | string | null) {
  if (!date) return 'Never';
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDate(date: Date | string) {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function DevicesList({ devices }: DevicesListProps) {
  const router = useRouter();
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [confirmDevice, setConfirmDevice] = useState<LinkedDevice | null>(null);

  const handleUnlink = async (deviceId: string) => {
    setUnlinkingId(deviceId);
    try {
      const res = await fetch('/api/auth/unlink-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId }),
      });

      if (res.ok) {
        tiqriToast.success('Device unlinked successfully');
        router.refresh();
      } else {
        const data = await res.json();
        tiqriToast.error(data.error || 'Failed to unlink device');
      }
    } catch {
      tiqriToast.error('An unexpected error occurred');
    } finally {
      setUnlinkingId(null);
      setConfirmDevice(null);
    }
  };

  if (devices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="rounded-full bg-muted p-5 mb-5">
          <SmartphoneNfc className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No Linked Devices
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Link a mobile device by clicking &quot;Link New Device&quot; above, then scan the
          QR code with the EITAMS Mobile Scanner app.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {devices.map((device) => {
          const DeviceIcon = getDeviceIcon(device.deviceOs);
          const osBadgeClass = getOsBadgeColor(device.deviceOs);
          const isUnlinking = unlinkingId === device.id;

          return (
            <div
              key={device.id}
              className="group relative rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:shadow-md hover:border-primary/20"
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-shrink-0 rounded-lg bg-primary/10 p-2.5">
                    <DeviceIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-foreground truncate">
                      {device.deviceName}
                    </h4>
                    {device.deviceModel && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {device.deviceModel}
                      </p>
                    )}
                  </div>
                </div>

                {device.deviceOs && (
                  <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${osBadgeClass}`}>
                    {device.deviceOs}
                  </span>
                )}
              </div>

              {/* Details */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>Last active: <span className="text-foreground font-medium">{formatRelativeTime(device.lastActiveAt)}</span></span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>Linked: <span className="text-foreground font-medium">{formatDate(device.linkedAt)}</span></span>
                </div>
              </div>

              {/* Unlink action */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDevice(device)}
                disabled={isUnlinking}
                className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-colors"
              >
                {isUnlinking ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Unlink className="h-3.5 w-3.5" />
                )}
                {isUnlinking ? 'Unlinking...' : 'Unlink Device'}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmDevice} onOpenChange={(open) => !open && setConfirmDevice(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink Device</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unlink <span className="font-semibold text-foreground">{confirmDevice?.deviceName}</span>?
              The device will immediately lose access to the EITAMS Mobile Scanner and will need to be re-paired.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDevice && handleUnlink(confirmDevice.id)}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              <Unlink className="mr-2 h-4 w-4" />
              Unlink Device
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
