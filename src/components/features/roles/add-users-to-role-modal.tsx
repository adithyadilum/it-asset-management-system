"use client"

import { useEffect, useMemo, useState } from "react"
import { CirclePlus, Info, Search, Trash2, X } from "lucide-react"

import { assignUsersRoleBulk, searchUsers } from "@/actions/roles"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography"
import { cn, getInitials } from "@/lib/utils"
import type { UserRole, RoleUser } from "@/types/auth"

interface AddUsersToRoleModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  defaultRole?: UserRole
  mappedUsers?: RoleUser[]
  onUpdated?: () => void
  currentUserId: string
}

const ROLE_ASSIGNMENT_LABELS: Record<UserRole, string> = {
  GlobalAdmin: "Global Admin",
  ITOperator: "IT Operations",
  FinanceAuditor: "Auditor",
  Employee: "Employee",
}

export function AddUsersToRoleModal({
  isOpen,
  onOpenChange,
  defaultRole = "Employee",
  mappedUsers = [],
  onUpdated,
  currentUserId,
}: AddUsersToRoleModalProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<RoleUser[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [hideUsersAlreadyInRole, setHideUsersAlreadyInRole] = useState(false)
  const [mappedSelection, setMappedSelection] = useState<RoleUser[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const roleLabelForAddMode = ROLE_ASSIGNMENT_LABELS[defaultRole]
  const normalizedQuery = searchQuery.trim()

  const mappedIdSet = useMemo(
    () => new Set(mappedSelection.map((roleUser) => roleUser.id)),
    [mappedSelection]
  )

  const alreadyAssignedIdSet = useMemo(
    () => new Set(mappedUsers.map((u) => u.id)),
    [mappedUsers]
  )

  const directoryResults = useMemo(() => {
    if (!normalizedQuery) {
      return []
    }

    return searchResults
      .filter((directoryUser) => {
        if (directoryUser.id === currentUserId) return false
        if (mappedIdSet.has(directoryUser.id)) return false
        if (hideUsersAlreadyInRole && (directoryUser.role === defaultRole || alreadyAssignedIdSet.has(directoryUser.id))) {
          return false
        }
        return true
      })
      .slice(0, 10)
  }, [currentUserId, hideUsersAlreadyInRole, mappedIdSet, alreadyAssignedIdSet, normalizedQuery, searchResults, defaultRole])

  const addUserToSelection = (directoryUser: RoleUser) => {
    setMappedSelection((currentSelection) => {
      if (currentSelection.some((selection) => selection.id === directoryUser.id)) {
        return currentSelection
      }
      return [...currentSelection, directoryUser]
    })
  }

  const removeUserFromSelection = (roleUserId: string) => {
    setMappedSelection((currentSelection) =>
      currentSelection.filter((selection) => selection.id !== roleUserId)
    )
  }

  useEffect(() => {
    if (!isOpen) {
      setIsSubmitting(false)
      setError(null)
      setSearchQuery("")
      setSearchResults([])
      setIsSearching(false)
      setSearchError(null)
      setHideUsersAlreadyInRole(false)
      setMappedSelection([])
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !normalizedQuery) {
      return
    }

    let isCancelled = false
    const searchDebounce = setTimeout(async () => {
      setIsSearching(true)
      setSearchError(null)

      try {
        const results = await searchUsers(normalizedQuery)
        if (isCancelled) return
        setSearchResults(results)
      } catch (caughtError) {
        if (isCancelled) return
        setSearchResults([])
        setSearchError(
          caughtError instanceof Error ? caughtError.message : "Failed to search users."
        )
      } finally {
        if (!isCancelled) setIsSearching(false)
      }
    }, 250)

    return () => {
      isCancelled = true
      clearTimeout(searchDebounce)
    }
  }, [isOpen, normalizedQuery])

  const handleSubmit = async () => {
    if (mappedSelection.length === 0) {
      setError("Select at least one user to map.")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await assignUsersRoleBulk(
        mappedSelection.map((selection) => selection.id),
        defaultRole
      )

      if (!result.success) {
        setError(result.error ?? "Failed to assign selected users.")
        return
      }

      onOpenChange(false)
      onUpdated?.()
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to assign selected users."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-190 p-0 overflow-hidden border-none shadow-2xl [&>button]:hidden">
        <DialogTitle className="sr-only">Assign Users to {roleLabelForAddMode}</DialogTitle>
        <DialogDescription className="sr-only">Search and map users to {roleLabelForAddMode}.</DialogDescription>

        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-muted-foreground" />
              <h2 className={cn("text-foreground", TYPOGRAPHY_CLASSNAMES.textLgSemiBold)}>
                Assign Users to {roleLabelForAddMode}
              </h2>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="-mr-1 -mt-1 text-muted-foreground hover:bg-muted"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Checkbox
              id="hide-already-mapped"
              checked={hideUsersAlreadyInRole}
              onCheckedChange={(checked) => setHideUsersAlreadyInRole(checked === true)}
              disabled={isSubmitting}
              className="border-border"
            />
            <label htmlFor="hide-already-mapped" className={cn("text-foreground", TYPOGRAPHY_CLASSNAMES.textSmMedium)}>
              Hide users already in this role
            </label>
          </div>

          <div className="mt-2 relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search company directory by name or email..."
              className={cn("h-9 rounded-lg border-border bg-background pl-9 font-normal", TYPOGRAPHY_CLASSNAMES.textSmRegular)}
              disabled={isSubmitting}
            />
          </div>

          {normalizedQuery ? (
            <div className="mt-3 rounded-lg border border-border bg-background p-3 shadow-sm">
              {isSearching ? (
                <div className="py-3 text-center">
                  <p className={cn("text-muted-foreground", TYPOGRAPHY_CLASSNAMES.textSmRegular)}>Searching users...</p>
                </div>
              ) : searchError ? (
                <div className="py-3 text-center">
                  <p className={cn("text-red-600", TYPOGRAPHY_CLASSNAMES.textSmMedium)}>{searchError}</p>
                </div>
              ) : directoryResults.length > 0 ? (
                <div className="space-y-2">
                  {directoryResults.map((directoryUser) => (
                    <div key={directoryUser.id} className="flex items-center justify-between gap-3">
                       <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="size-7 rounded-md">
                          <AvatarFallback className={cn("rounded-md bg-muted text-foreground", TYPOGRAPHY_CLASSNAMES.textXsMedium)}>
                            {getInitials(directoryUser.name)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0">
                          <p className={cn("truncate text-foreground", TYPOGRAPHY_CLASSNAMES.textSmSemiBold)}>
                            {directoryUser.name}
                          </p>
                          <p className={cn("truncate text-muted-foreground", TYPOGRAPHY_CLASSNAMES.textXsRegular)}>{directoryUser.email}</p>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="text-foreground hover:bg-muted"
                        onClick={() => addUserToSelection(directoryUser)}
                        disabled={isSubmitting}
                      >
                        <CirclePlus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-3 text-center">
                  <p className={cn("text-foreground", TYPOGRAPHY_CLASSNAMES.textSmSemiBold)}>No user found</p>
                  <p className={cn("mt-1 text-muted-foreground", TYPOGRAPHY_CLASSNAMES.textXsRegular)}>
                    Your search &quot;{searchQuery.trim()}&quot; did not match any users.
                  </p>
                </div>
              )}
            </div>
          ) : null}

          <div className="mt-3 rounded-lg border border-border bg-muted/80 p-3">
            {mappedSelection.length > 0 ? (
              <div className="max-h-25 space-y-2 overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:#64748b_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted">
                {mappedSelection.map((selection) => (
                  <div key={selection.id} className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="size-7 rounded-md">
                        <AvatarFallback className={cn("rounded-md bg-muted text-foreground", TYPOGRAPHY_CLASSNAMES.textXsMedium)}>
                          {getInitials(selection.name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0">
                        <p className={cn("truncate text-foreground", TYPOGRAPHY_CLASSNAMES.textSmSemiBold)}>{selection.name}</p>
                        <p className={cn("truncate text-muted-foreground", TYPOGRAPHY_CLASSNAMES.textXsRegular)}>{selection.email}</p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="text-red-400 hover:bg-red-50 hover:text-red-500"
                      onClick={() => removeUserFromSelection(selection.id)}
                      disabled={isSubmitting}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className={cn("py-2 text-center text-muted-foreground", TYPOGRAPHY_CLASSNAMES.textXsRegular)}>
                No users selected for this role.
              </div>
            )}
          </div>

          {error ? <p className={cn("mt-2 text-red-600", TYPOGRAPHY_CLASSNAMES.textSmMedium)}>{error}</p> : null}

          <div className="mt-3 flex items-center justify-end gap-2">
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
              onClick={handleSubmit}
              disabled={isSubmitting || mappedSelection.length === 0}
              className={cn("bg-primary px-4 text-primary-foreground hover:bg-primary/90", TYPOGRAPHY_CLASSNAMES.textSmMedium)}
            >
              {isSubmitting ? "Confirming..." : "Confirm Mapping"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
