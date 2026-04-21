'use client';

import { useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import type { UserRole } from '@/types/auth';

import {
  UserRoleAssignmentModal,
  type RoleUser,
} from './user-role-assignment-modal';

type RolesAddUserButtonProps = {
  selectedRole: UserRole;
  mappedUsers: RoleUser[];
  currentUserId: string;
};

export function RolesAddUserButton({
  selectedRole,
  mappedUsers,
  currentUserId,
}: RolesAddUserButtonProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleUpdated = () => {
    router.refresh();
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        className="h-8 w-32 justify-between rounded-lg bg-primary px-2.5 text-primary-foreground shadow-box-shadow-shadow-xs hover:bg-primary/90"
        onClick={() => setIsModalOpen(true)}
      >
        <PlusCircle className="h-4 w-4 shrink-0" />
        <span className="flex flex-1 items-center justify-center font-text-sm-medium text-(length:--text-sm-medium-font-size) leading-(--text-sm-medium-line-height) tracking-(--text-sm-medium-letter-spacing) [font-style:var(--text-sm-medium-font-style)]">
          Add User
        </span>
      </Button>

      <UserRoleAssignmentModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        user={null}
        mode="add"
        defaultRole={selectedRole}
        mappedUsers={mappedUsers}
        onUpdated={handleUpdated}
        currentUserId={currentUserId}
      />
    </>
  );
}
