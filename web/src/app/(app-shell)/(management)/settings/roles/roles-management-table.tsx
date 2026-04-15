"use client"

import { useMemo, useState } from "react"
import { CirclePlus, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { UserRole } from "@/types/auth"
import { RemoveUserModal } from "./remove-user-modal"
import { UserRoleAssignmentModal, type RoleUser } from "./user-role-assignment-modal"

type RolesManagementTableProps = {
  initialUsers: RoleUser[]
}

type RoleConfig = {
  id: UserRole
  label: string
  desc: string
}

const ROLE_CONFIG = [
  {
    id: "GlobalAdmin" as UserRole,
    label: "Global Admin",
    desc: "These users manage all system settings and role assignments.",
  },
  {
    id: "ITOperator" as UserRole,
    label: "IT Operations",
    desc: "These users have full read/write access to the Asset Registry and Maintenance modules.",
  },
  {
    id: "FinanceAuditor" as UserRole,
    label: "Auditor",
    desc: "These users have read-only access to financial ledgers and audit records.",
  },
] satisfies RoleConfig[]

const DEPARTMENT_SEQUENCE = ["IT", "HR", "Dev"]

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export function RolesManagementTable({ initialUsers }: RolesManagementTableProps) {
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState<UserRole>("ITOperator")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false)
  const [selectedUserForRemoval, setSelectedUserForRemoval] = useState<RoleUser | null>(null)

  const roleCounts = useMemo(() => {
    const counts = new Map<UserRole, number>()

    for (const role of ROLE_CONFIG) {
      const count = initialUsers.filter((user) => user.role === role.id).length
      counts.set(role.id, count)
    }

    return counts
  }, [initialUsers])

  const filteredUsers = useMemo(() => {
    return initialUsers.filter((u) => u.role === selectedRole)
  }, [initialUsers, selectedRole])

  const currentRoleInfo =
    ROLE_CONFIG.find((role) => role.id === selectedRole) ?? ROLE_CONFIG[0]

  const handleUpdated = () => {
    router.refresh()
  }

  const openRemoveModal = (user: RoleUser) => {
    setSelectedUserForRemoval(user)
    setIsRemoveModalOpen(true)
  }

  return (
    <>
      <section className="rounded-lg border border-border bg-background p-4">
        <h2 className="px-1 text-2xl leading-8 font-semibold tracking-tight text-slate-900">
          Role Assignment
        </h2>
        <div className="mt-3 space-y-3">
          {ROLE_CONFIG.map((role) => {
            const isActive = selectedRole === role.id
            const count = roleCounts.get(role.id) ?? 0

            return (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={cn(
                  "mr-auto flex h-[72px] w-[602px] max-w-full items-center justify-between rounded-lg border px-4 text-left transition-colors",
                  isActive
                    ? "border-border bg-muted text-slate-900"
                    : "border-border bg-background text-slate-700 hover:bg-muted/50"
                )}
              >
                <span className="text-base leading-6 font-medium tracking-normal">
                  {role.label}
                </span>
                <span
                  className={cn(
                    "inline-flex h-[22px] w-[62px] items-center justify-center rounded-[8px] border text-xs leading-4 font-semibold",
                    isActive
                      ? "border-[#4d69db] bg-[#eff3ff] text-[#1f43c2]"
                      : "border-[#9bb1f1] bg-[#f5f8ff] text-[#2d52cf]"
                  )}
                >
                  {count} Users
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="min-h-0 rounded-lg border border-border bg-background p-4">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg leading-7 tracking-tight text-slate-900">
              <span className="font-semibold">Users in </span>
              <span className="font-bold">{currentRoleInfo.label}</span>
            </h2>
            <p className="max-w-2xl text-sm leading-5 font-medium text-slate-700">
              {currentRoleInfo.desc}
            </p>
          </div>

          <Button
            size="sm"
            className="h-8 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            onClick={() => setIsAddModalOpen(true)}
          >
            <CirclePlus className="h-3.5 w-3.5" />
            Add User
          </Button>
        </div>

        <div className="overflow-hidden rounded-md border border-[#dbe3eb] bg-white">
          <table className="w-full table-fixed text-left">
            <thead className="border-b border-[#dbe3eb] bg-[#f6f8fa]">
              <tr className="text-sm font-medium text-slate-700">
                <th className="w-[38%] px-4 py-3">User</th>
                <th className="w-[18%] px-3 py-3 text-center">Department</th>
                <th className="w-[32%] px-3 py-3">SSO Sync Status</th>
                <th className="w-[12%] px-3 py-3 text-right" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user, index) => (
                <tr key={user.id} className="group">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-7 rounded-md">
                        <AvatarFallback className="rounded-md bg-slate-300 text-[10px] font-semibold text-slate-700">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
                        <p className="truncate text-xs text-slate-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-center text-sm font-medium text-slate-700">
                    {DEPARTMENT_SEQUENCE[index % DEPARTMENT_SEQUENCE.length]}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="inline-flex items-center whitespace-nowrap rounded-[8px] border border-[#b9dd7b] bg-[#f7fee9] px-2.5 py-0.5 text-xs font-semibold text-[#7aa800]">
                      Active - Azure AD
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="text-red-400 hover:bg-red-50 hover:text-red-500"
                      onClick={() => openRemoveModal(user)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-500">
                    No users assigned to this role.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <UserRoleAssignmentModal
        isOpen={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        user={null}
        mode="add"
        defaultRole={selectedRole}
        allUsers={initialUsers}
        mappedUsers={filteredUsers}
        onUpdated={handleUpdated}
      />

      <RemoveUserModal
        isOpen={isRemoveModalOpen}
        onOpenChange={setIsRemoveModalOpen}
        user={selectedUserForRemoval}
        targetRole={currentRoleInfo.label}
        onRemoved={handleUpdated}
      />
    </>
  )
}