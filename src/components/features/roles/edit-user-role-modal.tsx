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
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (!isOpen) {
      setIsSubmitting(false);
      setError(null);
    } else if (user) {
      setSelectedRole(user.role);
    }
  }

  const [prevUser, setPrevUser] = useState(user);
  if (user !== prevUser) {
    setPrevUser(user);
    if (isOpen && user) {
      setSelectedRole(user.role);
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
      <DialogContent className="overflow-hidden border-none p-0 shadow-2xl sm:max-w-125 [&>button]:hidden">
        <div className="p-6">
          <div className="mb-2 flex items-start justify-between">
            <DialogTitle
              className={cn(
                TYPOGRAPHY_CLASSNAMES.textLgSemiBold,
                'text-foreground'
              )}
            >
              Change User Role
            </DialogTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Close"
              className="-mr-2 -mt-2 h-8 w-8 text-muted-foreground hover:bg-muted hover:text-muted-foreground"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <DialogDescription
            className={cn(
              'mb-6 text-muted-foreground',
              TYPOGRAPHY_CLASSNAMES.textSmRegular
            )}
          >
            {user
              ? `Update the role for ${user.name}.`
              : 'Select a user to update.'}
          </DialogDescription>

          {user && (
            <div className="mx-1 mb-6 flex items-center gap-3 rounded-lg border border-border bg-muted/80 p-3">
              <Avatar className="h-10 w-10 overflow-hidden rounded-full bg-muted">
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

          <div className="space-y-1">
            <label
              htmlFor="user-role"
              className={cn(
                'text-foreground',
                TYPOGRAPHY_CLASSNAMES.textSmMedium
              )}
            >
              Role
            </label>
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

          {error ? (
            <p
              className={cn(
                'mt-3 text-red-600',
                TYPOGRAPHY_CLASSNAMES.textSmMedium
              )}
            >
              {error}
            </p>
          ) : null}

          <div className="mt-4 flex justify-end gap-3 pt-2">
            <Button
              type="button"
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
              type="button"
              className={cn('px-6', TYPOGRAPHY_CLASSNAMES.textSmMedium)}
              onClick={handleSubmit}
              disabled={isSubmitting || !user || isSelf}
            >
              {isSubmitting ? 'Updating...' : 'Update'}
            </Button>
          </div>

          {isSelf && (
            <p
              className={cn(
                'mt-2 text-right text-muted-foreground',
                TYPOGRAPHY_CLASSNAMES.textXsRegular
              )}
            >
              You cannot modify your own role.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
