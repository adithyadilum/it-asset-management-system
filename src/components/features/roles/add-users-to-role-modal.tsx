'use client';

import { useEffect, useMemo, useState } from 'react';
import { CirclePlus, Info, Loader2, Search, Trash2, X } from 'lucide-react';

import { assignUsersRoleBulk, searchUsers } from '@/actions/roles';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { cn, getInitials } from '@/lib/utils';
import type { UserRole, RoleUser } from '@/types/auth';

interface AddUsersToRoleModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  defaultRole?: UserRole;
  mappedUsers?: RoleUser[];
  onUpdated?: () => void;
  currentUserId: string;
}

const ROLE_ASSIGNMENT_LABELS: Record<UserRole, string> = {
  GlobalAdmin: 'Global Admin',
  ITOperator: 'IT Operations',
  FinancialAuditor: 'Financial Auditor',
  Employee: 'Employee',
};

export function AddUsersToRoleModal({
  isOpen,
  onOpenChange,
  defaultRole = 'Employee',
  mappedUsers = [],
  onUpdated,
  currentUserId,
}: AddUsersToRoleModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RoleUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [mappedSelection, setMappedSelection] = useState<RoleUser[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roleLabelForAddMode = ROLE_ASSIGNMENT_LABELS[defaultRole];
  const normalizedQuery = searchQuery.trim();

  const mappedIdSet = useMemo(
    () => new Set(mappedSelection.map((roleUser) => roleUser.id)),
    [mappedSelection]
  );

  const alreadyAssignedIdSet = useMemo(
    () => new Set(mappedUsers.map((u) => u.id)),
    [mappedUsers]
  );

  const directoryResults = useMemo(() => {
    if (!normalizedQuery) return [];
    return searchResults
      .filter((directoryUser) => {
        if (directoryUser.id === currentUserId) return false;
        if (mappedIdSet.has(directoryUser.id)) return false;
        // Always hide users who are already assigned to this role.
        if (
          directoryUser.role === defaultRole ||
          alreadyAssignedIdSet.has(directoryUser.id)
        ) {
          return false;
        }
        return true;
      })
      .slice(0, 10);
  }, [
    currentUserId,
    mappedIdSet,
    alreadyAssignedIdSet,
    normalizedQuery,
    searchResults,
    defaultRole,
  ]);

  const addUserToSelection = (directoryUser: RoleUser) => {
    setMappedSelection((prev) => {
      if (prev.some((s) => s.id === directoryUser.id)) return prev;
      return [...prev, directoryUser];
    });
  };

  const removeUserFromSelection = (roleUserId: string) => {
    setMappedSelection((prev) => prev.filter((s) => s.id !== roleUserId));
  };

  // ── Close handler — resets all local state (safe: called from an event, not render) ──
  // Every close path routes through here -- the dialog's own onOpenChange, the
  // header X, Cancel, and the close after a successful assign. Calling
  // `onOpenChange(false)` directly from any of them would skip the reset and
  // reopen the modal still holding the last search and selection.
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSearchQuery('');
      setSearchResults([]);
      setIsSearching(false);
      setSearchError(null);
      setMappedSelection([]);
      setIsSubmitting(false);
      setError(null);
    }
    onOpenChange(open);
  };

  // The server requires at least 2 characters before returning results.
  const canSearch = normalizedQuery.length >= 2;

  useEffect(() => {
    if (!isOpen || !canSearch) return;

    let isCancelled = false;
    const searchDebounce = setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);
      try {
        const results = await searchUsers(normalizedQuery);
        if (isCancelled) return;
        setSearchResults(results);
      } catch (caughtError) {
        if (isCancelled) return;
        setSearchResults([]);
        setSearchError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Failed to search users.'
        );
      } finally {
        if (!isCancelled) setIsSearching(false);
      }
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(searchDebounce);
    };
  }, [isOpen, canSearch, normalizedQuery]);

  const handleSubmit = async () => {
    if (mappedSelection.length === 0) {
      setError('Select at least one user to assign.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await assignUsersRoleBulk(
        mappedSelection.map((s) => s.id),
        defaultRole
      );

      if (!result.success) {
        setError(result.error ?? 'Failed to assign selected users.');
        return;
      }

      handleOpenChange(false);
      onUpdated?.();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to assign selected users.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="overflow-hidden border-none p-0 shadow-2xl sm:max-w-125 [&>button]:hidden">
        {/* ── Header ── */}
        <div className="flex items-start justify-between border-b border-border px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <Info className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <DialogTitle
                className={cn(
                  TYPOGRAPHY_CLASSNAMES.textLgSemiBold,
                  'text-foreground'
                )}
              >
                Assign Users to {roleLabelForAddMode}
              </DialogTitle>
            </div>
            <DialogDescription
              className={cn(
                'mt-0.5 pl-7 text-muted-foreground',
                TYPOGRAPHY_CLASSNAMES.textSmRegular
              )}
            >
              Search and select users to assign to this role.
            </DialogDescription>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close"
            className="-mr-2 -mt-2 h-8 w-8 text-muted-foreground hover:bg-muted hover:text-muted-foreground"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* ── Body ── */}
        <div className="space-y-4 px-6 py-4">
          {/* Search input */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="user-search"
              aria-label="Search users by name or email"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search company directory by name or email..."
              className={cn(
                'h-9 rounded-lg border-border bg-background pl-9 font-normal',
                TYPOGRAPHY_CLASSNAMES.textSmRegular
              )}
              disabled={isSubmitting}
              autoComplete="off"
            />
          </div>

          {/* Search results */}
          {normalizedQuery.length === 1 ? (
            <p
              className={cn(
                'text-muted-foreground',
                TYPOGRAPHY_CLASSNAMES.textSmRegular
              )}
            >
              Type at least 2 characters to search.
            </p>
          ) : canSearch ? (
            <div className="rounded-lg border border-border bg-background p-3 shadow-sm">
              {isSearching ? (
                <div className="flex items-center justify-center gap-2 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <p
                    className={cn(
                      'text-muted-foreground',
                      TYPOGRAPHY_CLASSNAMES.textSmRegular
                    )}
                  >
                    Searching users...
                  </p>
                </div>
              ) : searchError ? (
                <div className="py-3 text-center">
                  <p
                    className={cn(
                      'text-destructive',
                      TYPOGRAPHY_CLASSNAMES.textSmMedium
                    )}
                  >
                    {searchError}
                  </p>
                </div>
              ) : directoryResults.length > 0 ? (
                <div className="space-y-1">
                  {directoryResults.map((directoryUser) => (
                    <div
                      key={directoryUser.id}
                      className="flex items-center justify-between gap-3 rounded-md px-1 py-1 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="size-7 rounded-md">
                          <AvatarFallback
                            className={cn(
                              'rounded-md bg-muted text-foreground',
                              TYPOGRAPHY_CLASSNAMES.textXsMedium
                            )}
                          >
                            {getInitials(directoryUser.name)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0">
                          <p
                            className={cn(
                              'truncate text-foreground',
                              TYPOGRAPHY_CLASSNAMES.textSmSemiBold
                            )}
                          >
                            {directoryUser.name}
                          </p>
                          <p
                            className={cn(
                              'truncate text-muted-foreground',
                              TYPOGRAPHY_CLASSNAMES.textXsRegular
                            )}
                          >
                            {directoryUser.email}
                          </p>
                        </div>
                      </div>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              className="shrink-0 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                              onClick={() => addUserToSelection(directoryUser)}
                              disabled={isSubmitting}
                              aria-label={`Add ${directoryUser.name} to selection`}
                            >
                              <CirclePlus className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Add {directoryUser.name} to selection
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 py-4 text-center">
                  <p
                    className={cn(
                      'text-foreground',
                      TYPOGRAPHY_CLASSNAMES.textSmSemiBold
                    )}
                  >
                    No user found
                  </p>
                  <p
                    className={cn(
                      'text-muted-foreground',
                      TYPOGRAPHY_CLASSNAMES.textXsRegular
                    )}
                  >
                    &quot;{searchQuery.trim()}&quot; did not match any users.
                  </p>
                </div>
              )}
            </div>
          ) : null}

          {/* Selected users staging area */}
          <div>
            <p
              className={cn(
                'mb-1.5 text-foreground',
                TYPOGRAPHY_CLASSNAMES.textSmMedium
              )}
            >
              Selected users
              {mappedSelection.length > 0 && (
                <span
                  className={cn(
                    'ml-1.5 text-muted-foreground',
                    TYPOGRAPHY_CLASSNAMES.textSmRegular
                  )}
                >
                  ({mappedSelection.length})
                </span>
              )}
            </p>

            <div className="rounded-lg border border-border bg-muted/50 p-3">
              {mappedSelection.length > 0 ? (
                <div className="max-h-36 space-y-1 overflow-y-auto pr-1 [scrollbar-color:#64748b_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted">
                  {mappedSelection.map((selection) => (
                    <div
                      key={selection.id}
                      className="flex items-center justify-between gap-3 rounded-md px-1 py-1"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="size-7 rounded-md">
                          <AvatarFallback
                            className={cn(
                              'rounded-md bg-background text-foreground',
                              TYPOGRAPHY_CLASSNAMES.textXsMedium
                            )}
                          >
                            {getInitials(selection.name)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0">
                          <p
                            className={cn(
                              'truncate text-foreground',
                              TYPOGRAPHY_CLASSNAMES.textSmSemiBold
                            )}
                          >
                            {selection.name}
                          </p>
                          <p
                            className={cn(
                              'truncate text-muted-foreground',
                              TYPOGRAPHY_CLASSNAMES.textXsRegular
                            )}
                          >
                            {selection.email}
                          </p>
                        </div>
                      </div>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              className="shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              onClick={() =>
                                removeUserFromSelection(selection.id)
                              }
                              disabled={isSubmitting}
                              aria-label={`Remove ${selection.name} from selection`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Remove {selection.name} from selection
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className={cn(
                    'py-4 text-center text-muted-foreground',
                    TYPOGRAPHY_CLASSNAMES.textSmRegular
                  )}
                >
                  No users selected. Search above to add users.
                </div>
              )}
            </div>
          </div>

          {/* Submission error */}
          {error ? (
            <p
              className={cn(
                'text-destructive',
                TYPOGRAPHY_CLASSNAMES.textSmMedium
              )}
            >
              {error}
            </p>
          ) : null}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
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
            onClick={handleSubmit}
            disabled={isSubmitting || mappedSelection.length === 0}
            className={cn(
              'px-6 bg-primary text-primary-foreground hover:bg-primary/90',
              TYPOGRAPHY_CLASSNAMES.textSmMedium
            )}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Assigning...
              </span>
            ) : (
              `Assign${mappedSelection.length > 0 ? ` (${mappedSelection.length})` : ''}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
