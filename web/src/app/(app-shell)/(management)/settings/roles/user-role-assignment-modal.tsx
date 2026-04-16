"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { CirclePlus, Info, Search, Trash2, X } from "lucide-react"

import { assignUserRole } from "@/actions/roles"
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
  mode?: "edit" | "add"
  defaultRole?: UserRole
  allUsers?: RoleUser[]
  mappedUsers?: RoleUser[]
  onUpdated?: () => void
}

const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: "GlobalAdmin", label: "Global Admin" },
  { value: "ITOperator", label: "IT Operator" },
  { value: "FinanceAuditor", label: "Finance Auditor" },
  { value: "Employee", label: "Employee" },
]

const ROLE_ASSIGNMENT_LABELS: Record<UserRole, string> = {
  GlobalAdmin: "Global Admin",
  ITOperator: "IT Operations",
  FinanceAuditor: "Auditor",
  Employee: "Employee",
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

// Defensive dedupe protects the staged list when source arrays are rebuilt.
function dedupeUsers(users: RoleUser[]) {
  const seen = new Set<number>()
  const unique: RoleUser[] = []

  for (const roleUser of users) {
    if (seen.has(roleUser.id)) {
      continue
    }

    seen.add(roleUser.id)
    unique.push(roleUser)
  }

  return unique
}

export function UserRoleAssignmentModal({
  isOpen,
  onOpenChange,
  user,
  mode = "edit",
  defaultRole = "Employee",
  allUsers = [],
  mappedUsers = [],
  onUpdated,
}: UserRoleAssignmentModalProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>("Employee")
  const [searchQuery, setSearchQuery] = useState("")
  const [hideUsersAlreadyInRole, setHideUsersAlreadyInRole] = useState(false)
  const [mappedSelection, setMappedSelection] = useState<RoleUser[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const roleLabelForAddMode = ROLE_ASSIGNMENT_LABELS[defaultRole]

  const normalizedQuery = searchQuery.trim().toLowerCase()

  const mappedIdSet = useMemo(
    () => new Set(mappedSelection.map((roleUser) => roleUser.id)),
    [mappedSelection]
  )

  // Directory results exclude already-staged users and optionally hide already-mapped users.
  const directoryResults = useMemo(() => {
    if (mode !== "add" || !normalizedQuery) {
      return []
    }

    return allUsers
      .filter((directoryUser) => {
        const matchesSearch =
          directoryUser.name.toLowerCase().includes(normalizedQuery) ||
          directoryUser.email.toLowerCase().includes(normalizedQuery)

        if (!matchesSearch) {
          return false
        }

        if (mappedIdSet.has(directoryUser.id)) {
          return false
        }

        if (hideUsersAlreadyInRole && directoryUser.role === defaultRole) {
          return false
        }

        return true
      })
      .slice(0, 8)
  }, [allUsers, defaultRole, hideUsersAlreadyInRole, mappedIdSet, mode, normalizedQuery])

  const activeUser = mode === "edit" ? user : null

  const addUserToSelection = (directoryUser: RoleUser) => {
    setMappedSelection((currentSelection) => {
      if (currentSelection.some((selection) => selection.id === directoryUser.id)) {
        return currentSelection
      }

      return [...currentSelection, directoryUser]
    })
  }

  const removeUserFromSelection = (roleUserId: number) => {
    setMappedSelection((currentSelection) =>
      currentSelection.filter((selection) => selection.id !== roleUserId)
    )
  }

  // Reset add-mode UI state whenever the modal session starts or ends.
  const resetAddModeState = useCallback(() => {
    setSearchQuery("")
    setHideUsersAlreadyInRole(false)
    setMappedSelection(dedupeUsers(mappedUsers))
  }, [mappedUsers])

  useEffect(() => {
    if (isOpen) {
      if (mode === "add") {
        setSelectedRole(defaultRole)
        resetAddModeState()
      } else if (user) {
        setSelectedRole(user.role)
      }

      setError(null)
      setIsSubmitting(false)
      return
    }

    if (!isOpen) {
      setIsSubmitting(false)
      setError(null)
      setSelectedRole(mode === "add" ? defaultRole : (user?.role ?? "Employee"))

      if (mode === "add") {
        resetAddModeState()
      }
    }
  }, [defaultRole, isOpen, mode, resetAddModeState, user])

  // Handles two submit flows: bulk mapping in add mode and single-user update in edit mode.
  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      if (mode === "add") {
        if (mappedSelection.length === 0) {
          setError("Select at least one user to map.")
          return
        }

        const usersNeedingAssignment = mappedSelection.filter(
          (selection) => selection.role !== defaultRole
        )

        for (const selection of usersNeedingAssignment) {
          const result = await assignUserRole(selection.id, defaultRole)

          if (!result.success) {
            setError(result.error ?? "Failed to assign selected users.")
            return
          }
        }

        onOpenChange(false)
        onUpdated?.()
        return
      }

      if (!activeUser) {
        setError("Select a user to update.")
        return
      }

      const result = await assignUserRole(activeUser.id, selectedRole)

      if (!result.success) {
        setError(result.error ?? "Failed to update role.")
        return
      }

      onOpenChange(false)
      onUpdated?.()
    } catch {
      setError(mode === "add" ? "Failed to assign selected users." : "Failed to update role. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] p-0 overflow-hidden border-none shadow-2xl [&>button]:hidden">
        <DialogTitle className="sr-only">
          {mode === "add" ? `Assign Users to ${roleLabelForAddMode}` : "Change User Role"}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {mode === "add"
            ? `Search and map users to ${roleLabelForAddMode}.`
            : user
              ? `Update permissions for ${user.name} (${user.email}).`
              : "Select a user to update their role."}
        </DialogDescription>

        {mode === "add" ? (
          <div className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-slate-500" />
                <h2 className="text-[30px] leading-9 font-semibold tracking-tight text-slate-900">
                  Assign Users to {roleLabelForAddMode}
                </h2>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="-mr-1 -mt-1 text-slate-500 hover:bg-slate-100"
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
                className="border-slate-300"
              />
              <label htmlFor="hide-already-mapped" className="text-sm font-medium text-slate-700">
                Hide users already in this role
              </label>
            </div>

            <div className="mt-2 relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search company directory by name or email..."
                className="h-9 rounded-lg border-slate-200 bg-white pl-9 text-sm"
                disabled={isSubmitting}
              />
            </div>

            {normalizedQuery ? (
              <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                {directoryResults.length > 0 ? (
                  <div className="space-y-2">
                    {directoryResults.map((directoryUser) => (
                      <div key={directoryUser.id} className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar className="size-7 rounded-md">
                            <AvatarFallback className="rounded-md bg-slate-300 text-[10px] font-semibold text-slate-700">
                              {getInitials(directoryUser.name)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {directoryUser.name}
                            </p>
                            <p className="truncate text-xs text-slate-500">{directoryUser.email}</p>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="text-slate-700 hover:bg-slate-100"
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
                    <p className="text-base font-semibold text-slate-900">No user found</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Your search &quot;{searchQuery.trim()}&quot; did not match any users.
                    </p>
                  </div>
                )}
              </div>
            ) : null}

            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-100/80 p-3">
              {mappedSelection.length > 0 ? (
                <div className="max-h-[100px] space-y-2 overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:#64748b_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-500">
                  {mappedSelection.map((selection) => (
                    <div key={selection.id} className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="size-7 rounded-md">
                          <AvatarFallback className="rounded-md bg-slate-300 text-[10px] font-semibold text-slate-700">
                            {getInitials(selection.name)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{selection.name}</p>
                          <p className="truncate text-xs text-slate-500">{selection.email}</p>
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
                <div className="py-2 text-center text-xs text-slate-500">
                  No users selected for this role.
                </div>
              )}
            </div>

            {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

            <div className="mt-3 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || mappedSelection.length === 0}
                className="bg-primary px-4 text-primary-foreground hover:bg-primary/90"
              >
                {isSubmitting ? "Confirming..." : "Confirm Mapping"}
              </Button>
            </div>
          </div>
        ) : user ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Change User Role</h3>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="text-slate-500 hover:bg-slate-100"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

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

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleSubmit} disabled={isSubmitting || !activeUser}>
                {isSubmitting ? "Updating..." : "Update Role"}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}