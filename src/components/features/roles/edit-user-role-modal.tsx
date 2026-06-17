"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"

import { assignUserRole } from "@/actions/roles"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography"
import { cn } from "@/lib/utils"
import type { UserRole, RoleUser } from "@/types/auth"

interface EditUserRoleModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  user: RoleUser | null
  onUpdated?: () => void
  currentUserId: string
}

const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: "GlobalAdmin", label: "Global Admin" },
  { value: "ITOperator", label: "IT Operator" },
  { value: "FinanceAuditor", label: "Finance Auditor" },
  { value: "Employee", label: "Employee" },
]

export function EditUserRoleModal({
  isOpen,
  onOpenChange,
  user,
  onUpdated,
  currentUserId,
}: EditUserRoleModalProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>("Employee")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setIsSubmitting(false)
      setError(null)
    } else if (user) {
      setSelectedRole(user.role)
    }
  }, [isOpen, user])

  const handleSubmit = async () => {
    if (!user) {
      setError("Select a user to update.")
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
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to update role. Please try again."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const isSelf = user?.id === currentUserId

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-190 p-0 overflow-hidden border-none shadow-2xl [&>button]:hidden">
        <DialogTitle className="sr-only">Change User Role</DialogTitle>
        <DialogDescription className="sr-only">
          {user ? `Update permissions for ${user.name} (${user.email}).` : "Select a user to update their role."}
        </DialogDescription>

        <div className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h3 className={cn("text-foreground", TYPOGRAPHY_CLASSNAMES.textLgSemiBold)}>Change User Role</h3>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground hover:bg-muted"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="space-y-1">
            <label htmlFor="user-role" className={cn("text-foreground", TYPOGRAPHY_CLASSNAMES.textSmMedium)}>
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

          {error ? <p className={cn("text-red-600", TYPOGRAPHY_CLASSNAMES.textSmMedium)}>{error}</p> : null}

          <div className="flex flex-col items-end gap-2 pt-1">
            <div className="flex w-full justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className={TYPOGRAPHY_CLASSNAMES.textSmMedium}
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className={TYPOGRAPHY_CLASSNAMES.textSmMedium}
                onClick={handleSubmit}
                disabled={isSubmitting || !user || isSelf}
              >
                {isSubmitting ? "Updating..." : "Update Role"}
              </Button>
            </div>
            
            {isSelf && (
              <p className={cn("text-right text-muted-foreground", TYPOGRAPHY_CLASSNAMES.textXsRegular)}>
                You cannot modify your own role.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
