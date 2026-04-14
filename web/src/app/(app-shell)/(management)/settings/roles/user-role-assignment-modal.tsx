"use client"

import { useEffect, useState } from "react"

import { assignUserRole } from "@/actions/roles"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { UserRole } from "@/types/auth"

export type RoleUser = {
  id: number
  name: string
  email: string
  role: UserRole
}

interface UserRoleAssignmentModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  user: RoleUser | null
  onUpdated?: () => void
}

const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: "GlobalAdmin", label: "Global Admin" },
  { value: "ITOperator", label: "IT Operator" },
  { value: "FinanceAuditor", label: "Finance Auditor" },
  { value: "Employee", label: "Employee" },
]

export function UserRoleAssignmentModal({
  isOpen,
  onOpenChange,
  user,
  onUpdated,
}: UserRoleAssignmentModalProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>("Employee")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      setSelectedRole(user.role)
      setError(null)
    }
  }, [user])

  const handleSubmit = async () => {
    if (!user) {
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await assignUserRole(user.id, selectedRole)

      if (!result.success) {
        setError(result.error ?? "Failed to update role.")
        return
      }

      onOpenChange(false)
      onUpdated?.()
    } catch {
      setError("Failed to update role. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Change User Role</DialogTitle>
          <DialogDescription>
            {user
              ? `Update permissions for ${user.name} (${user.email}).`
              : "Select a user to update their role."}
          </DialogDescription>
        </DialogHeader>

        {user ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="user-role" className="text-sm font-medium text-slate-700">
                Role
              </label>
              <select
                id="user-role"
                value={selectedRole}
                onChange={(event) => setSelectedRole(event.target.value as UserRole)}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-slate-300"
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !user}>
            {isSubmitting ? "Updating..." : "Update Role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}