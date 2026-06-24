'use client';

import { useState, useMemo, useCallback, useTransition, useEffect } from 'react';
import { PlusCircle, Trash2, Pencil } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DataTable } from '@/components/shared/data-table';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn, getInitials } from '@/lib/utils';
import type { UserRole, RoleUser } from '@/types/auth';
import { setUserActiveStatus } from '@/actions/roles';

import { RemoveUserModal } from './remove-user-modal';
import { AddUsersToRoleModal } from './add-users-to-role-modal';
import { EditUserRoleModal } from './edit-user-role-modal';

type RolesManagementTableProps = {
  users: RoleUser[];
  roleLabel: string;
  currentUserId: string;
  selectedRole: UserRole;
};

export function RolesManagementTable({
  users,
  roleLabel,
  currentUserId,
  selectedRole,
}: RolesManagementTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [selectedUserForRemoval, setSelectedUserForRemoval] =
    useState<RoleUser | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] =
    useState<RoleUser | null>(null);

  // Optimistic active-status overrides: userId → isActive
  // Applied immediately on toggle click; cleared when the server data refreshes.
  const [optimisticStatus, setOptimisticStatus] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    setOptimisticStatus({});
  }, [selectedRole]);

  const openRemoveModal = (user: RoleUser) => {
    setSelectedUserForRemoval(user);
    setIsRemoveModalOpen(true);
  };

  const openEditModal = (user: RoleUser) => {
    setSelectedUserForEdit(user);
    setIsEditModalOpen(true);
  };

  const handleUpdated = () => {
    setOptimisticStatus({});
    router.refresh();
  };

  const handleToggleActive = useCallback(
    (user: RoleUser, newValue: boolean) => {
      // Optimistically flip the toggle immediately
      setOptimisticStatus((prev) => ({ ...prev, [user.id]: newValue }));

      startTransition(async () => {
        const result = await setUserActiveStatus(user.id, newValue);
        if (!result.success) {
          // Revert on failure
          setOptimisticStatus((prev) => ({ ...prev, [user.id]: !newValue }));
          console.error('[Roles] Failed to toggle user active status:', result.error);
        } else {
          router.refresh();
        }
      });
    },
    [router]
  );

  const columns = useMemo<ColumnDef<RoleUser>[]>(
    () => {
      const baseCols: ColumnDef<RoleUser>[] = [
        {
          accessorKey: 'name',
          header: 'User',
          cell: ({ row }) => {
            const user = row.original;
            return (
              <div className="flex items-center gap-4 py-1">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback
                    className={cn(
                      'rounded-lg bg-muted text-foreground',
                      TYPOGRAPHY_CLASSNAMES.textXsMedium
                    )}
                  >
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0">
                  <p className={cn('truncate text-foreground', TYPOGRAPHY_CLASSNAMES.textSmSemiBold)}>
                    {user.name}
                  </p>
                  <p className={cn('truncate text-muted-foreground', TYPOGRAPHY_CLASSNAMES.textXsRegular)}>
                    {user.email}
                  </p>
                </div>
              </div>
            );
          },
        },
        {
          accessorKey: 'department',
          header: 'Department',
          cell: ({ row }) => (
            <span className={cn('text-foreground', TYPOGRAPHY_CLASSNAMES.textSmRegular)}>
              {row.original.department}
            </span>
          ),
        },
        {
          id: 'status',
          header: 'Active',
          cell: ({ row }) => {
            const user = row.original;
            const isSelf = user.id === currentUserId;
            // Use the optimistic override if set, otherwise fall back to server data
            const isActiveDisplay =
              user.id in optimisticStatus
                ? optimisticStatus[user.id]
                : user.isActive;

            return (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center">
                    <Switch
                      checked={isActiveDisplay}
                      onCheckedChange={(checked) =>
                        handleToggleActive(user, checked)
                      }
                      disabled={isSelf || isPending}
                      aria-label={`${isActiveDisplay ? 'Deactivate' : 'Activate'} ${user.name}`}
                      size="sm"
                    />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {isSelf
                    ? 'You cannot disable your own account'
                    : isActiveDisplay
                    ? `Deactivate ${user.name}`
                    : `Activate ${user.name}`}
                </TooltipContent>
              </Tooltip>
            );
          },
          size: 80,
        },
      ];

      baseCols.push({
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const user = row.original;
          const isSelf = user.id === currentUserId;

          return (
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => openEditModal(user)}
                    aria-label={`Edit role and status for ${user.name}`}
                    disabled={isSelf}
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {isSelf
                    ? 'You cannot modify your own role or status'
                    : 'Edit role and status'}
                </TooltipContent>
              </Tooltip>

              {selectedRole !== 'Employee' && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => openRemoveModal(user)}
                      aria-label={`Remove ${user.name} from ${roleLabel}`}
                      disabled={isSelf}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isSelf
                      ? 'You cannot remove your own role'
                      : `Remove ${user.name} from ${roleLabel}`}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          );
        },
        size: 100,
      });

      return baseCols;
    },
    [currentUserId, roleLabel, selectedRole, optimisticStatus, handleToggleActive, isPending]
  );

  return (
    <TooltipProvider>
      {selectedRole !== 'Employee' && (
        <div className="flex w-full justify-end mb-4">
          <Button
            type="button"
            size="sm"
            className="h-8 w-32 justify-between rounded-lg bg-primary px-2.5 text-primary-foreground shadow-box-shadow-shadow-xs hover:bg-primary/90"
            onClick={() => setIsAddModalOpen(true)}
          >
            <PlusCircle className="h-4 w-4 shrink-0" />
            <span className={cn("flex flex-1 items-center justify-center", TYPOGRAPHY_CLASSNAMES.textSmMedium)}>
              Add User
            </span>
          </Button>
        </div>
      )}

      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
        <DataTable
          columns={columns}
          data={users}
          enableRowScroll={true}
          enableRowSelection={false}
          initialPageSize={50}
          pageSizeOptions={[10, 20, 50, 100]}
          className="flex-1 border-border"
          emptyState={{
            title: 'No users found',
            description: 'No users have been assigned to this role yet.',
          }}
        />
      </div>

      <RemoveUserModal
        isOpen={isRemoveModalOpen}
        onOpenChange={setIsRemoveModalOpen}
        user={selectedUserForRemoval}
        targetRole={roleLabel}
        onRemoved={handleUpdated}
      />

      <AddUsersToRoleModal
        isOpen={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        defaultRole={selectedRole}
        mappedUsers={users}
        onUpdated={handleUpdated}
        currentUserId={currentUserId}
      />

      <EditUserRoleModal
        isOpen={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        user={selectedUserForEdit}
        onUpdated={handleUpdated}
        currentUserId={currentUserId}
      />
    </TooltipProvider>
  );
}
