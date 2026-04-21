'use client';

import { useState } from 'react';
import { ChevronsUpDown, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';

import { RemoveUserModal } from './remove-user-modal';
import type { RoleUser } from './user-role-assignment-modal';

type RolesManagementTableProps = {
  users: RoleUser[];
  roleLabel: string;
  currentUserId: string;
};

const SSO_SYNC_STATUS_LABEL = 'Active - Azure AD';
const textXsSemiBoldClass =
  'font-text-xs-semi-bold text-(length:--text-xs-semi-bold-font-size) leading-(--text-xs-semi-bold-line-height) tracking-(--text-xs-semi-bold-letter-spacing) [font-style:var(--text-xs-semi-bold-font-style)]';
const textSmRegularClass =
  'font-text-sm-regular text-(length:--text-sm-regular-font-size) leading-(--text-sm-regular-line-height) tracking-(--text-sm-regular-letter-spacing) [font-style:var(--text-sm-regular-font-style)]';

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

  return (
    <>
      <div className="self-stretch w-full overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full border-collapse">
          <thead>
            <tr className="h-10 border-b border-slate-200 bg-slate-50">
              <th className="px-4 text-left font-text-sm-medium text-(length:--text-sm-medium-font-size) leading-(--text-sm-medium-line-height) tracking-(--text-sm-medium-letter-spacing) text-slate-900 [font-style:var(--text-sm-medium-font-style)]">
                User
              </th>
              <th className="px-2 text-center font-text-sm-medium text-(length:--text-sm-medium-font-size) leading-(--text-sm-medium-line-height) tracking-(--text-sm-medium-letter-spacing) text-slate-900 [font-style:var(--text-sm-medium-font-style)]">
                Department
              </th>
              <th className="px-2 text-center font-text-sm-medium text-(length:--text-sm-medium-font-size) leading-(--text-sm-medium-line-height) tracking-(--text-sm-medium-letter-spacing) text-slate-900 [font-style:var(--text-sm-medium-font-style)]">
                SSO Sync Status
              </th>
              <th className="w-18.75 px-2">
                <ChevronsUpDown className="h-4 w-4 text-slate-900" />
              </th>
            </tr>
          </thead>

          <tbody>
            {users.map((user) => {
              const isSelf = user.id === currentUserId;

              return (
                <tr
                  key={user.id}
                  className="h-12.25 border-b border-slate-200 last:border-b-0"
                >
                  <td className="pl-4 pr-2 py-2">
                    <div className="flex items-center gap-4 p-2">
                      <Avatar className="h-8 w-8 rounded-lg">
                        <AvatarFallback
                          className={`rounded-lg bg-slate-200 text-slate-700 ${textXsSemiBoldClass}`}
                        >
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0">
                        <p className="truncate font-text-sm-semi-bold text-(length:--text-sm-semi-bold-font-size) leading-(--text-sm-semi-bold-line-height) tracking-(--text-sm-semi-bold-letter-spacing) text-slate-900 [font-style:var(--text-sm-semi-bold-font-style)]">
                          {user.name}
                        </p>
                        <p className="truncate font-text-xs-regular text-(length:--text-xs-regular-font-size) leading-(--text-xs-regular-line-height) tracking-(--text-xs-regular-letter-spacing) text-slate-900 [font-style:var(--text-xs-regular-font-style)]">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-3.5 py-2 text-center">
                    <span className="font-text-sm-regular text-(length:--text-sm-regular-font-size) leading-(--text-sm-regular-line-height) tracking-(--text-sm-regular-letter-spacing) text-slate-900 [font-style:var(--text-sm-regular-font-style)]">
                      {user.department}
                    </span>
                  </td>

                  <td className="px-3.5 py-2 text-center">
                    <div className="inline-flex h-5.5 items-center justify-center gap-1 rounded-lg border border-success bg-success/10 px-1.5 py-0.5">
                      <span className="font-text-sm-medium text-(length:--text-sm-medium-font-size) leading-(--text-sm-medium-line-height) tracking-(--text-sm-medium-letter-spacing) text-success [font-style:var(--text-sm-medium-font-style)]">
                        {SSO_SYNC_STATUS_LABEL}
                      </span>
                    </div>
                  </td>

                  <td className="w-18.75 px-3.5 py-2">
                    <button
                      type="button"
                      className="flex h-8 w-full items-center gap-2 rounded-lg px-2.5 py-0 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => openRemoveModal(user)}
                      aria-label={`Remove ${user.name} from ${roleLabel}`}
                      disabled={isSelf}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </td>
                </tr>
              );
            })}

            {users.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className={`px-4 py-6 text-center text-slate-500 ${textSmRegularClass}`}
                >
                  No users found for this role.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
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
