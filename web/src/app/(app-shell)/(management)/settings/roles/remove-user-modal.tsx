"use client"

import { useEffect, useMemo, useState } from "react"
import { Info, X } from "lucide-react"

import { assignUserRole } from "@/actions/roles"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
// UI Components
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import type { UserRole } from "@/types/auth"

export interface SystemUser {
  id: number
  name: string
  email: string
  role: UserRole
}

interface RemoveUserModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  user: SystemUser | null
  targetRole?: string
  onRemoved?: () => void
}

export function RemoveUserModal({
  isOpen,
  onOpenChange,
  user,
  targetRole = "IT Operations",
  onRemoved,
}: RemoveUserModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const initials = useMemo(() => {
    if (!user) {
      return "?"
    }

    return user.name
      .split(" ")
      .map((part) => part[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase()
  }, [user])

  useEffect(() => {
    if (!isOpen) {
      // Clear transient modal state between openings.
      setIsSubmitting(false)
      setError(null)
    }
  }, [isOpen])

  // Role removal is implemented by assigning the baseline Employee role.
  const handleRemove = async () => {
    if (!user) {
      setError("User details are missing.")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Reuse the secured role-assignment action to keep auth/validation centralized.
      const result = await assignUserRole(user.id, "Employee")

      if (!result.success) {
        setError(result.error ?? "Failed to remove user from this role.")
        return
      }

      onOpenChange(false)
      onRemoved?.()
    } catch {
      setError("Failed to remove user from this role.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-125 p-0 overflow-hidden border-none shadow-2xl [&>button]:hidden">
        <div className="p-6">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-slate-400 mt-0.5" />
              <DialogTitle className="text-lg font-bold text-slate-900">
                Remove User from {targetRole}
              </DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close"
              className="h-8 w-8 -mr-2 -mt-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <DialogDescription className="text-sm text-slate-600 mb-6 ml-7">
            This user will lose all privileges associated with the {targetRole} role.
          </DialogDescription>

          <div className="flex items-center gap-3 bg-slate-50/80 p-3 rounded-lg border border-slate-100 mb-6 mx-1">
            <Avatar className="h-10 w-10 rounded-full bg-slate-200 overflow-hidden">
              <AvatarFallback className="rounded-full bg-slate-300 text-xs font-semibold text-slate-700">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-900">{user?.name ?? "Unknown User"}</p>
              <p className="text-xs text-slate-500">{user?.email ?? ""}</p>
            </div>
          </div>

          {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="px-6 font-medium hover:bg-slate-100"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#D32F2F] hover:bg-[#B71C1C] px-6 text-white font-medium shadow-sm transition-colors"
              onClick={handleRemove}
              disabled={isSubmitting || !user}
            >
              {isSubmitting ? "Removing..." : "Remove"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}