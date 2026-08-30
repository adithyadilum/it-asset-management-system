'use client';

import * as React from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function OfflineBanner() {
  const isOnline = React.useSyncExternalStore(
    (callback) => {
      if (typeof window === 'undefined') return () => {};
      window.addEventListener('online', callback);
      window.addEventListener('offline', callback);
      return () => {
        window.removeEventListener('online', callback);
        window.removeEventListener('offline', callback);
      };
    },
    () => (typeof navigator !== 'undefined' ? navigator.onLine : true),
    () => true // getServerSnapshot returns true to prevent hydration mismatch
  );

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-2 sm:p-4 animate-in slide-in-from-top-2 flex justify-center pointer-events-none">
      <Alert
        variant="destructive"
        className="bg-destructive text-destructive-foreground w-full max-w-xl shadow-lg border-none flex items-center gap-3 pointer-events-auto"
      >
        <AlertCircle className="h-5 w-5 shrink-0" />
        <div className="flex-1">
          <AlertTitle className="text-sm font-semibold m-0">
            You are offline
          </AlertTitle>
          <AlertDescription className="text-xs mt-1">
            Some features may be unavailable until your connection is restored.
          </AlertDescription>
        </div>
      </Alert>
    </div>
  );
}
