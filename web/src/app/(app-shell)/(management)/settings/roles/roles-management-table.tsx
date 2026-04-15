"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { searchUsers } from "@/actions/roles"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { UserRole } from "@/types/auth"

import {
    UserRoleAssignmentModal,
    type RoleUser,
} from "./user-role-assignment-modal"

type RolesManagementTableProps = {
    initialUsers: RoleUser[]
}

function roleLabel(role: UserRole) {
    if (role === "GlobalAdmin") return "Global Admin"
    if (role === "ITOperator") return "IT Operator"
    if (role === "FinanceAuditor") return "Finance Auditor"
    return "Employee"
}

export function RolesManagementTable({ initialUsers }: RolesManagementTableProps) {
    const router = useRouter()
    const [query, setQuery] = useState("")
    const [users, setUsers] = useState<RoleUser[]>(initialUsers)
    const [isSearching, setIsSearching] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [selectedUser, setSelectedUser] = useState<RoleUser | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    useEffect(() => {
        let isCancelled = false

        const runSearch = async () => {
            const trimmed = query.trim()

            if (!trimmed) {
                setUsers(initialUsers)
                setError(null)
                return
            }

            setIsSearching(true)
            setError(null)

            try {
                const result = await searchUsers(trimmed)
                if (!isCancelled) {
                    setUsers(result)
                }
            } catch {
                if (!isCancelled) {
                    setError("Search failed. Please try again.")
                }
            } finally {
                if (!isCancelled) {
                    setIsSearching(false)
                }
            }
        }

        const timer = setTimeout(runSearch, 250)

        return () => {
            isCancelled = true
            clearTimeout(timer)
        }
    }, [query, initialUsers])

    const totalUsers = useMemo(() => users.length, [users])

    const openAssignmentModal = (user: RoleUser) => {
        setSelectedUser(user)
        setIsModalOpen(true)
    }

    const handleUpdated = () => {
        router.refresh()
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm text-slate-600">Manage and assign platform roles.</p>
                    <p className="text-xs text-slate-500">{totalUsers} users loaded</p>
                </div>

                <div className="w-full sm:w-80">
                    <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search users by name or email"
                    />
                </div>
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                            <th className="px-4 py-3">Name</th>
                            <th className="px-4 py-3">Email</th>
                            <th className="px-4 py-3">Role</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {users.map((user) => (
                            <tr key={user.id}>
                                <td className="px-4 py-3 font-medium text-slate-900">{user.name}</td>
                                <td className="px-4 py-3 text-slate-600">{user.email}</td>
                                <td className="px-4 py-3 text-slate-700">{roleLabel(user.role)}</td>
                                <td className="px-4 py-3 text-right">
                                    <Button size="sm" variant="outline" onClick={() => openAssignmentModal(user)}>
                                        Change Role
                                    </Button>
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                                    {isSearching ? "Searching users..." : "No users found."}
                                </td>
                            </tr>
                        ) : null}
                    </tbody>
                </table>
            </div>

            <UserRoleAssignmentModal
                isOpen={isModalOpen}
                onOpenChange={setIsModalOpen}
                user={selectedUser}
                onUpdated={handleUpdated}
            />
        </div>
    )
}