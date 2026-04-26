"use client"

import { useMemo, useState } from "react"
import { Info, X } from "lucide-react"

import { removeUserFromManagedRole } from "@/actions/roles"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import type { UserRole } from "@/types/auth"

export interface SystemUser {
  id: string
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

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen)
  if (!isOpen && prevIsOpen) {
    setPrevIsOpen(false)
    setIsSubmitting(false)
    setError(null)
  } else if (isOpen && !prevIsOpen) {
    setPrevIsOpen(true)
  }

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
      <DialogContent className="overflow-hidden border-none p-0 shadow-2xl sm:max-w-125 [&>button]:hidden">
        <div className="p-6">
          <div className="mb-2 flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Info className="mt-0.5 h-5 w-5 text-slate-400" />
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

          <div className="mx-1 mb-6 flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/80 p-3">
            <Avatar className="h-10 w-10 overflow-hidden rounded-full bg-slate-200">
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
              className={`bg-destructive px-6 text-destructive-foreground shadow-sm transition-colors hover:bg-destructive/90 ${textSmMediumClass}`}
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