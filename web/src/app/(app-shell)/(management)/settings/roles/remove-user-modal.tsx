"use client"

import { useEffect, useMemo, useState } from "react"
import { Info, X } from "lucide-react"

import { removeUserFromManagedRole } from "@/actions/roles"
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

const textXsRegularClass =
  "font-text-xs-regular text-(length:--text-xs-regular-font-size) leading-(--text-xs-regular-line-height) tracking-(--text-xs-regular-letter-spacing) [font-style:var(--text-xs-regular-font-style)]"
const textXsSemiBoldClass =
  "font-text-xs-semi-bold text-(length:--text-xs-semi-bold-font-size) leading-(--text-xs-semi-bold-line-height) tracking-(--text-xs-semi-bold-letter-spacing) [font-style:var(--text-xs-semi-bold-font-style)]"
const textSmRegularClass =
  "font-text-sm-regular text-(length:--text-sm-regular-font-size) leading-(--text-sm-regular-line-height) tracking-(--text-sm-regular-letter-spacing) [font-style:var(--text-sm-regular-font-style)]"
const textSmMediumClass =
  "font-text-sm-medium text-(length:--text-sm-medium-font-size) leading-(--text-sm-medium-line-height) tracking-(--text-sm-medium-letter-spacing) [font-style:var(--text-sm-medium-font-style)]"
const textSmSemiBoldClass =
  "font-text-sm-semi-bold text-(length:--text-sm-semi-bold-font-size) leading-(--text-sm-semi-bold-line-height) tracking-(--text-sm-semi-bold-letter-spacing) [font-style:var(--text-sm-semi-bold-font-style)]"
const textLgBoldClass =
  "font-text-lg-bold text-(length:--text-lg-bold-font-size) leading-(--text-lg-bold-line-height) tracking-(--text-lg-bold-letter-spacing) [font-style:var(--text-lg-bold-font-style)]"

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

  const handleRemove = async () => {
    if (!user) {
      setError("User details are missing.")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await removeUserFromManagedRole(user.id)

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
              <DialogTitle className={`${textLgBoldClass} text-slate-900`}>
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

          <DialogDescription className={`mb-6 ml-7 text-slate-600 ${textSmRegularClass}`}>
            This user will lose all privileges associated with the {targetRole} role.
          </DialogDescription>

          <div className="flex items-center gap-3 bg-slate-50/80 p-3 rounded-lg border border-slate-100 mb-6 mx-1">
            <Avatar className="h-10 w-10 rounded-full bg-slate-200 overflow-hidden">
              <AvatarFallback className={`rounded-full bg-slate-300 text-slate-700 ${textXsSemiBoldClass}`}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <p className={`${textSmSemiBoldClass} text-slate-900`}>{user?.name ?? "Unknown User"}</p>
              <p className={`${textXsRegularClass} text-slate-500`}>{user?.email ?? ""}</p>
            </div>
          </div>

          {error ? <p className={`mb-3 text-red-600 ${textSmMediumClass}`}>{error}</p> : null}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className={`px-6 hover:bg-slate-100 ${textSmMediumClass}`}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              className={`bg-[#D32F2F] hover:bg-[#B71C1C] px-6 text-white shadow-sm transition-colors ${textSmMediumClass}`}
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