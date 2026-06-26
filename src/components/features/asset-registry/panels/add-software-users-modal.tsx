'use client';
import { LoadingSpinner } from "@/components/shared/loading-spinner";

import * as React from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { tiqriToast } from '@/components/shared/sonner';
import { cn } from '@/lib/utils';
import { searchUsers, type UserSearchResult } from '@/actions/users';
import { allocateSoftwareLicensesAction } from '@/actions/software';

interface AddSoftwareUsersModalProps {
  isOpen: boolean;
  onClose: (didAllocate?: boolean) => void;
  assetId: string;
  availableSeats: number;
  existingAllocations?: { id: string }[];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function AddSoftwareUsersModal({
  isOpen,
  onClose,
  assetId,
  availableSeats,
  existingAllocations = [],
}: AddSoftwareUsersModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [selectedUsers, setSelectedUsers] = React.useState<UserSearchResult[]>([]);

  // Search state
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const debouncedQuery = useDebounce(searchQuery, 300);
  const [searchResults, setSearchResults] = React.useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);

  // Memoize allocated IDs to prevent infinite re-renders
  const allocatedIdsString = React.useMemo(() => {
    return existingAllocations.map(a => a.id).sort().join(',');
  }, [existingAllocations]);

  // Reset state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedUsers([]);
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [isOpen]);

  // Handle search
  React.useEffect(() => {
    let isMounted = true;

    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsSearching(true);
      searchUsers(debouncedQuery)
        .then((result) => {
          if (isMounted) {
            if (result.success && result.data) {
              const allocatedIds = new Set(allocatedIdsString ? allocatedIdsString.split(',') : []);
              setSearchResults(result.data.filter(u => !allocatedIds.has(u.id)));
            } else {
              setSearchResults([]);
            }
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsSearching(false);
          }
        });
    }

    return () => {
      isMounted = false;
    };
  }, [debouncedQuery, open, allocatedIdsString]);

  const toggleUser = (user: UserSearchResult) => {
    setSelectedUsers((prev) => {
      const isSelected = prev.some((u) => u.id === user.id);
      if (isSelected) {
        return prev.filter((u) => u.id !== user.id);
      }

      if (prev.length >= availableSeats) {
        tiqriToast.error(`You can only allocate up to ${availableSeats} users.`);
        return prev;
      }

      return [...prev, user];
    });
  };

  const removeUser = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const handleSubmit = async () => {
    if (selectedUsers.length === 0) {
      tiqriToast.error('Please select at least one user.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await allocateSoftwareLicensesAction(
        assetId,
        selectedUsers.map((u) => u.id)
      );

      if (result.success) {
        tiqriToast.success(`Successfully allocated ${result.allocatedCount} user(s).`);
        onClose(true);
      } else {
        tiqriToast.error(result.error || 'Failed to allocate users.');
      }
    } catch (error) {
      console.error(error);
      tiqriToast.error('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose(false)}>
      <DialogContent className="sm:max-w-125 max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Allocate Software License</DialogTitle>
          <DialogDescription>
            Search and select users to allocate to this software license. You have {availableSeats} seat(s) available.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4 min-h-0 overflow-y-auto">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between shrink-0"
              >
                {selectedUsers.length > 0
                  ? `${selectedUsers.length} user(s) selected`
                  : 'Search for users...'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-112.5 p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                />
                <CommandList className="max-h-60">
                  {isSearching && (
                    <div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                      <LoadingSpinner size="sm" />
                      Searching...
                    </div>
                  )}
                  {!isSearching && searchResults.length === 0 && (
                    <CommandEmpty>No users found.</CommandEmpty>
                  )}
                  {!isSearching && searchResults.length > 0 && (
                    <CommandGroup>
                      {searchResults.map((user) => {
                        const isSelected = selectedUsers.some((u) => u.id === user.id);
                        return (
                          <CommandItem
                            key={user.id}
                            value={user.id}
                            onSelect={() => toggleUser(user)}
                            className="flex items-center gap-3 py-2"
                          >
                            <Check
                              className={cn(
                                'h-4 w-4',
                                isSelected ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-[10px]">
                                {getInitials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-medium leading-none truncate">
                                {user.name}
                              </span>
                              <span className="text-xs text-muted-foreground truncate mt-1">
                                {user.email}
                              </span>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Selected Users List using Avatars */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-col gap-2 min-h-0 max-h-40 overflow-y-auto pr-2 rounded-md border p-2">
              <div className="text-xs font-semibold text-muted-foreground mb-1 px-1 shrink-0">
                Selected Users ({selectedUsers.length}/{availableSeats})
              </div>
              {selectedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-muted/50 border bg-card shrink-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium leading-none truncate">
                        {user.name}
                      </span>
                      <span className="text-xs text-muted-foreground truncate mt-1">
                        {user.email}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeUser(user.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onClose(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedUsers.length === 0}
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner size="sm" />
                Allocating...
              </>
            ) : (
              'Allocate Users'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
