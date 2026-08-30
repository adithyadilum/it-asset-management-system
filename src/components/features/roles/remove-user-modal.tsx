'use client';

import { useEffect, useMemo, useState } from 'react';
import { Info, X } from 'lucide-react';

import { removeUserFromManagedRole } from '@/actions/roles';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
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
      <DialogContent className="overflow-hidden border-none p-0 shadow-2xl sm:max-w-125 [&>button]:hidden">
        <div className="p-6">
          <div className="mb-2 flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Info className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <DialogTitle
                className={cn(
                  TYPOGRAPHY_CLASSNAMES.textLgSemiBold,
                  'text-foreground'
                )}
              >
                Remove User from {targetRole}
              </DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close"
              className="h-8 w-8 -mr-2 -mt-2 text-muted-foreground hover:text-muted-foreground hover:bg-muted"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <DialogDescription
            className={cn(
              'mb-6 ml-7 text-muted-foreground',
              TYPOGRAPHY_CLASSNAMES.textSmRegular
            )}
          >
            This user will lose all privileges associated with the {targetRole}{' '}
            role.
          </DialogDescription>

          <div className="mx-1 mb-6 flex items-center gap-3 rounded-lg border border-border bg-muted/80 p-3">
            <Avatar className="h-10 w-10 overflow-hidden rounded-full bg-muted">
              <AvatarFallback
                className={cn(
                  'rounded-full bg-muted text-foreground',
                  TYPOGRAPHY_CLASSNAMES.textXsMedium
                )}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <p
                className={cn(
                  'text-foreground',
                  TYPOGRAPHY_CLASSNAMES.textSmSemiBold
                )}
              >
                {user?.name ?? 'Unknown User'}
              </p>
              <p
                className={cn(
                  'text-muted-foreground',
                  TYPOGRAPHY_CLASSNAMES.textXsRegular
                )}
              >
                {user?.email ?? ''}
              </p>
            </div>
          </div>

          {error ? (
            <p
              className={cn(
                'mb-3 text-red-600',
                TYPOGRAPHY_CLASSNAMES.textSmMedium
              )}
            >
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className={cn(
                'px-6 hover:bg-muted',
                TYPOGRAPHY_CLASSNAMES.textSmMedium
              )}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              className={cn(
                'bg-destructive px-6 text-destructive-foreground shadow-sm transition-colors hover:bg-destructive/90',
                TYPOGRAPHY_CLASSNAMES.textSmMedium
              )}
              onClick={handleRemove}
              disabled={isSubmitting || !user}
            >
              {isSubmitting ? 'Removing...' : 'Remove'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
