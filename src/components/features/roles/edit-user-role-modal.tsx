'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

import { assignUserRole } from '@/actions/roles';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { cn, getInitials } from '@/lib/utils';
import type { UserRole, RoleUser } from '@/types/auth';

interface EditUserRoleModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: RoleUser | null;
  onUpdated?: () => void;
  currentUserId: string;
}

const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: 'GlobalAdmin', label: 'Global Admin' },
  { value: 'ITOperator', label: 'IT Operator' },
  { value: 'FinancialAuditor', label: 'Financial Auditor' },
  { value: 'Employee', label: 'Employee' },
];

export function EditUserRoleModal({
  isOpen,
  onOpenChange,
  user,
  onUpdated,
  currentUserId,
}: EditUserRoleModalProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>('Employee');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset during render rather than in an effect. `react-hooks/set-state-in-effect`
  // rejects setState inside an effect body, and the compiler is right to: the
  // effect version renders once with the previous user's role before correcting
  // itself. Comparing against the previous props is React's documented way to
  // adjust state when props change.
  const [prevOpenUser, setPrevOpenUser] = useState<{
    isOpen: boolean;
    user: typeof user;
  }>({ isOpen, user });

  if (prevOpenUser.isOpen !== isOpen || prevOpenUser.user !== user) {
    setPrevOpenUser({ isOpen, user });
    if (isOpen) {
      setIsSubmitting(false);
      setError(null);
      if (user) setSelectedRole(user.role);
    }
  }

  const handleSubmit = async () => {
    if (!user) {
      setError('Select a user to update.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (selectedRole !== user.role) {
        const result = await assignUserRole(user.id, selectedRole);
        if (!result.success) {
          setError(result.error ?? 'Failed to update role.');
          setIsSubmitting(false);
          return;
        }
      }

      onOpenChange(false);
      onUpdated?.();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to update user. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSelf = user?.id === currentUserId;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-none p-0 shadow-2xl sm:max-w-md [&>button]:hidden">
        {/* ── Header ── */}
        <DialogHeader className="flex flex-row items-start justify-between border-b border-border px-6 py-4">
          <div>
            <DialogTitle
              className={cn(
                TYPOGRAPHY_CLASSNAMES.textLgSemiBold,
                'text-foreground'
              )}
            >
              Change User Role
            </DialogTitle>
            <DialogDescription
              className={cn(
                'mt-0.5 text-muted-foreground',
                TYPOGRAPHY_CLASSNAMES.textSmRegular
              )}
            >
              {user
                ? `Update the role for ${user.name}.`
                : 'Select a user to update.'}
            </DialogDescription>
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
          {user && (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-3">
              <Avatar className="h-10 w-10 overflow-hidden rounded-full">
                <AvatarFallback
                  className={cn(
                    'rounded-full bg-muted text-foreground',
                    TYPOGRAPHY_CLASSNAMES.textXsMedium
                  )}
                >
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 text-left">
                <p
                  className={cn(
                    'truncate text-foreground',
                    TYPOGRAPHY_CLASSNAMES.textSmSemiBold
                  )}
                >
                  {user.name}
                </p>
                <p
                  className={cn(
                    'truncate text-muted-foreground',
                    TYPOGRAPHY_CLASSNAMES.textXsRegular
                  )}
                >
                  {user.email}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label
              htmlFor="user-role"
              className={cn(
                'text-foreground',
                TYPOGRAPHY_CLASSNAMES.textSmMedium
              )}
            >
              Role
            </Label>
            <Select
              value={selectedRole}
              onValueChange={(val) => setSelectedRole(val as UserRole)}
              disabled={isSubmitting || isSelf}
            >
              <SelectTrigger id="user-role" className="w-full">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isSelf && (
            <p
              className={cn(
                'text-muted-foreground',
                TYPOGRAPHY_CLASSNAMES.textXsRegular
              )}
            >
              You cannot modify your own role.
            </p>
          )}

          {error && (
            <p
              className={cn(
                'text-destructive',
                TYPOGRAPHY_CLASSNAMES.textSmMedium
              )}
            >
              {error}
            </p>
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
            onClick={handleSubmit}
            disabled={isSubmitting || !user || isSelf}
            className="h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm rounded-lg disabled:opacity-50"
          >
            {isSubmitting ? 'Updating...' : 'Update Role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
