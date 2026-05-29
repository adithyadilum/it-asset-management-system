'use client';

import { useState, useMemo } from 'react';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DataTable } from '@/components/shared/data-table';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { cn } from '@/lib/utils';

import { RemoveUserModal } from './remove-user-modal';
import type { RoleUser } from './user-role-assignment-modal';

type RolesManagementTableProps = {
  users: RoleUser[];
  roleLabel: string;
  currentUserId: string;
};

const SSO_SYNC_STATUS_LABEL = 'Active - Azure AD';

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function RolesManagementTable({
  users,
  roleLabel,
  currentUserId,
}: RolesManagementTableProps) {
  const router = useRouter();
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [selectedUserForRemoval, setSelectedUserForRemoval] =
    useState<RoleUser | null>(null);

  const openRemoveModal = (user: RoleUser) => {
    setSelectedUserForRemoval(user);
    setIsRemoveModalOpen(true);
  };

  const handleRemoved = () => {
    router.refresh();
  };

  const columns = useMemo<ColumnDef<RoleUser>[]>(
    () => [
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
        id: 'ssoStatus',
        header: 'SSO Sync Status',
        cell: () => (
          <div className="inline-flex h-5.5 items-center justify-center gap-1 rounded-lg border border-success bg-success/10 px-1.5 py-0.5">
            <span className={cn('text-success', TYPOGRAPHY_CLASSNAMES.textSmMedium)}>
              {SSO_SYNC_STATUS_LABEL}
            </span>
          </div>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const user = row.original;
          const isSelf = user.id === currentUserId;

          return (
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => openRemoveModal(user)}
              aria-label={`Remove ${user.name} from ${roleLabel}`}
              disabled={isSelf}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </button>
          );
        },
        size: 80,
      },
    ],
    [currentUserId, roleLabel]
  );

  return (
    <>
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
        onRemoved={handleRemoved}
      />
    </>
  );
}
