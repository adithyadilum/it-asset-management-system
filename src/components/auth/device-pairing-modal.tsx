'use client';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, RefreshCw, QrCode } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type PairingState = 'loading' | 'active' | 'expired' | 'success' | 'error';

interface DevicePairingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

async function pairingRequest(url: string, method = 'GET', timeoutMs = 5000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method,
      signal: controller.signal,
      cache: 'no-store',
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchQRToken(): Promise<{ token: string; expires_in: number }> {
  const res = await pairingRequest('/api/auth/generate-qr', 'POST', 10000);
  if (!res.ok) throw new Error('Failed to generate token');
  return res.json();
}

export default function DevicePairingModal({
  open,
  onOpenChange,
}: DevicePairingModalProps) {
  return (
    <PairingDialog key={String(open)} open={open} onOpenChange={onOpenChange} />
  );
}

function PairingDialog({ open, onOpenChange }: DevicePairingModalProps) {
  const router = useRouter();
  const [pairingState, setPairingState] = useState<PairingState>('loading');
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [pollingError, setPollingError] = useState(false);
  const requestVersion = useRef<symbol | null>(null);

  // Initial fetch when modal opens
  useEffect(() => {
    if (!open) return;
    const version = Symbol();
    requestVersion.current = version;
    let mounted = true;

    fetchQRToken()
      .then((data) => {
        if (!mounted || version !== requestVersion.current) return;
        setLinkToken(data.token);
        setTimeLeft(data.expires_in || 60);
        setPairingState('active');
      })
      .catch(() => {
        if (!mounted || version !== requestVersion.current) return;
        setPairingState('error');
      });

    return () => {
      mounted = false;
      requestVersion.current = Symbol();
    };
  }, [open]);

  // Manual regeneration
  const regenerate = useCallback(() => {
    const version = Symbol();
    requestVersion.current = version;
    setPairingState('loading');
    setLinkToken(null);
    fetchQRToken()
      .then((data) => {
        if (version !== requestVersion.current) return;
        setLinkToken(data.token);
        setTimeLeft(data.expires_in || 60);
        setPairingState('active');
      })
      .catch(() => {
        if (version === requestVersion.current) setPairingState('error');
      });
  }, []);

  // Reset on close
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        requestVersion.current = Symbol();
        // Reset to default states when closed so it's ready for next open
        setPairingState('loading');
        setLinkToken(null);
        setTimeLeft(60);
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange]
  );

  // Countdown timer — setState happens inside the setInterval callback,
  // not synchronously in the effect body.
  useEffect(() => {
    if (!open || pairingState !== 'active') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setPairingState('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, pairingState]);

  // Polling to check if the mobile app claimed the token
  useEffect(() => {
    if (!open || pairingState !== 'active' || !linkToken) return;
    let active = true;
    let checking = false;

    const pollInterval = setInterval(async () => {
      if (checking) return;
      checking = true;
      try {
        const res = await pairingRequest(
          `/api/auth/check-qr-status?token=${linkToken}`
        );
        if (!res.ok) throw new Error('Pairing confirmation unavailable');
        const data = await res.json();
        if (!active) return;
        setPollingError(false);

        if (data.claimed) {
          setPairingState('success');
          clearInterval(pollInterval);
          router.refresh();
        }
      } catch {
        if (active) setPollingError(true);
      } finally {
        checking = false;
      }
    }, 2000);

    return () => {
      active = false;
      clearInterval(pollInterval);
    };
  }, [open, pairingState, linkToken, router]);

  useEffect(() => {
    if (!open || pairingState !== 'success') return;
    const timer = setTimeout(() => onOpenChange(false), 2000);
    return () => clearTimeout(timer);
  }, [open, pairingState, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            Device Pairing
          </DialogTitle>
          <DialogDescription>
            Scan this code using the EITAMS Mobile Scanner app to securely link
            your device.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center min-h-[300px] p-6 space-y-6">
          {/* STATE: LOADING */}
          {pairingState === 'loading' && (
            <div className="flex flex-col items-center text-muted-foreground animate-pulse">
              <LoadingSpinner size="sm" />
              <p>Generating secure token...</p>
            </div>
          )}

          {pairingState === 'error' && (
            <div className="space-y-4 text-center" role="alert">
              <p className="font-semibold">Unable to generate a pairing code</p>
              <p className="text-sm text-muted-foreground">
                The pairing service is temporarily unavailable. Please try
                again.
              </p>
              <Button onClick={regenerate} className="gap-2">
                <RefreshCw className="size-4" />
                Try again
              </Button>
            </div>
          )}

          {/* STATE: ACTIVE & EXPIRED (QR Code Container) */}
          {(pairingState === 'active' || pairingState === 'expired') && (
            <div className="relative flex flex-col items-center w-full">
              <div
                className={`p-4 bg-white rounded-xl transition-all duration-500 ease-in-out ${
                  pairingState === 'expired'
                    ? 'blur-md opacity-40 scale-95'
                    : 'blur-0 opacity-100 scale-100 shadow-lg'
                }`}
              >
                {linkToken && (
                  <QRCodeSVG
                    value={linkToken}
                    size={200}
                    level="H"
                    className="w-full h-auto"
                  />
                )}
              </div>

              {pairingState === 'expired' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="p-4 rounded-full bg-destructive/10 text-destructive mb-3">
                    <RefreshCw className="w-8 h-8" />
                  </div>
                  <p className="font-semibold text-lg mb-4">Code Expired</p>
                  <Button onClick={regenerate} className="gap-2 shadow-lg">
                    <RefreshCw className="w-4 h-4" />
                    Regenerate Code
                  </Button>
                </div>
              )}

              {pairingState === 'active' && (
                <div className="mt-6 flex flex-col items-center">
                  <span
                    className={`text-2xl font-mono font-medium tracking-wider transition-colors ${
                      timeLeft <= 10
                        ? 'text-destructive animate-pulse'
                        : 'text-foreground'
                    }`}
                  >
                    00:{timeLeft.toString().padStart(2, '0')}
                  </span>
                  <p className="text-sm text-muted-foreground mt-1">
                    Code expires in 60 seconds
                  </p>
                  {pollingError && (
                    <p
                      role="status"
                      className="mt-2 text-center text-sm text-muted-foreground"
                    >
                      Waiting for pairing confirmation. Retrying...
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STATE: SUCCESS */}
          {pairingState === 'success' && (
            <div className="flex flex-col items-center justify-center animate-in zoom-in duration-300">
              <div className="rounded-full bg-green-500/10 p-6 mb-4">
                <CheckCircle2 className="w-16 h-16 text-green-500" />
              </div>
              <h3 className="text-2xl font-bold tracking-tight text-foreground">
                Device Linked!
              </h3>
              <p className="text-muted-foreground mt-2 text-center">
                Your mobile scanner is now authenticated and ready to use.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
