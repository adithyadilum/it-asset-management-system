'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

import { removeUserFromManagedRole } from '@/actions/roles';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { cn, getInitials } from '@/lib/utils';
import type { SystemUser } from '@/types/auth';

interface RemoveUserModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: SystemUser | null;
  targetRole?: string;
  onRemoved?: () => void;
}

export function RemoveUserModal({
  isOpen,
  onOpenChange,
  user,
  targetRole,
  onRemoved,
}: RemoveUserModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials = useMemo(() => {
    if (!user) {
      return '?';
    }
    return getInitials(user.name);
  }, [user]);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setIsSubmitting(false);
        setError(null);
      }, 0);
    }
  }, [isOpen]);

  const handleRemove = async () => {
    if (!user) {
      setError('User details are missing.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await removeUserFromManagedRole(user.id);

      if (!result.success) {
        setError(result.error ?? 'Failed to remove user from this role.');
        return;
      }

      onOpenChange(false);
      onRemoved?.();
    } catch {
      setError('Failed to remove user from this role.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-none p-0 shadow-2xl sm:max-w-md [&>button]:hidden">
        {/* ── Header ── */}
        <DialogHeader className="flex flex-row items-start justify-between border-b border-border px-6 py-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <DialogTitle
                className={cn(
                  TYPOGRAPHY_CLASSNAMES.textLgSemiBold,
                  'text-foreground'
                )}
              >
                Remove User from {targetRole}
              </DialogTitle>
              <DialogDescription
                className={cn(
                  'mt-0.5 text-muted-foreground',
                  TYPOGRAPHY_CLASSNAMES.textSmRegular
                )}
              >
                This user will lose all privileges associated with the{' '}
                {targetRole} role.
              </DialogDescription>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close"
            className="-mr-2 -mt-2 h-8 w-8 shrink-0 text-muted-foreground hover:bg-muted hover:text-muted-foreground"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            <X className="h-5 w-5" />
          </Button>
        </DialogHeader>

        {/* ── Body ── */}
        <div className="space-y-4 px-6 py-4">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-3">
            <Avatar className="h-10 w-10 overflow-hidden rounded-full">
              <AvatarFallback
                className={cn(
                  'rounded-full bg-muted text-foreground',
                  TYPOGRAPHY_CLASSNAMES.textXsMedium
                )}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 text-left">
              <p
                className={cn(
                  'truncate text-foreground',
                  TYPOGRAPHY_CLASSNAMES.textSmSemiBold
                )}
              >
                {user?.name ?? 'Unknown User'}
              </p>
              <p
                className={cn(
                  'truncate text-muted-foreground',
                  TYPOGRAPHY_CLASSNAMES.textXsRegular
                )}
              >
                {user?.email ?? ''}
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3">
              <p
                className={cn(
                  'text-destructive',
                  TYPOGRAPHY_CLASSNAMES.textSmMedium
                )}
              >
                {error}
              </p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <DialogFooter className="flex items-center justify-end gap-2 border-t border-border px-6 py-4 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="h-9 px-4 bg-secondary border border-border text-secondary-foreground hover:bg-secondary/80 shadow-sm rounded-lg"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleRemove}
            disabled={isSubmitting || !user}
            className="h-9 px-4 bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm rounded-lg disabled:opacity-50"
          >
            {isSubmitting ? 'Removing...' : 'Remove User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
