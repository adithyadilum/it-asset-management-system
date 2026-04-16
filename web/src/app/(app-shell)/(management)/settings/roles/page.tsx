import Link from "next/link"
import { jwtVerify } from "jose"
import { and, asc, eq, isNull, sql } from "drizzle-orm"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { db } from "@/db"
import { sessions, users } from "@/db/schema"
import { getJwtSecretKey } from "@/lib/jwt"
import type { UserRole } from "@/types/auth"

import { RolesAddUserButton } from "./roles-add-user-button"
import { RolesManagementTable } from "./roles-management-table"

const SESSION_COOKIE_NAME = "session_token"

const ROLE_CONFIG: Array<{
    id: UserRole
    name: string
    description: string
}> = [
        {
            id: "GlobalAdmin",
            name: "Global Admin",
            description: "These users manage all system settings and role assignments.",
        },
        {
            id: "ITOperator",
            name: "IT Operations",
            description: "These users have full read/write access to the Asset Registry and Maintenance modules.",
        },
        {
            id: "FinanceAuditor",
            name: "Auditor",
            description: "These users have read-only access to financial ledgers and audit records.",
        },
    ]

const textSmRegularClass =
    "font-text-sm-regular text-(length:--text-sm-regular-font-size) leading-(--text-sm-regular-line-height) tracking-(--text-sm-regular-letter-spacing) [font-style:var(--text-sm-regular-font-style)]"
const textSmMediumClass =
    "font-text-sm-medium text-(length:--text-sm-medium-font-size) leading-(--text-sm-medium-line-height) tracking-(--text-sm-medium-letter-spacing) [font-style:var(--text-sm-medium-font-style)]"
const textBaseSemiBoldClass =
    "font-text-base-semi-bold text-(length:--text-base-semi-bold-font-size) leading-(--text-base-semi-bold-line-height) tracking-(--text-base-semi-bold-letter-spacing) [font-style:var(--text-base-semi-bold-font-style)]"

type RolesPageProps = {
    searchParams: Promise<{
        role?: string | string[]
    }>
}

function normalizeSelectedRole(value: string | string[] | undefined): UserRole {
    const selected = Array.isArray(value) ? value[0] : value

    if (
        selected === "GlobalAdmin" ||
        selected === "ITOperator" ||
        selected === "FinanceAuditor"
    ) {
        return selected
    }

    return "ITOperator"
}

async function assertRolesPageAccess() {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

    if (!token) {
        redirect("/login")
    }

    try {
        const { payload } = await jwtVerify(token, getJwtSecretKey())
        const userId = Number(payload.sub)
        const sessionId = payload.sid

        if (!Number.isInteger(userId) || userId <= 0 || typeof sessionId !== "string") {
            redirect("/login")
        }

        const activeSession = await db
            .select({ id: sessions.id })
            .from(sessions)
            .where(
                and(
                    eq(sessions.userId, userId),
                    eq(sessions.tokenId, sessionId),
                    isNull(sessions.revokedAt),
                    sql`${sessions.expiresAt} > NOW()`
                )
            )
            .limit(1)

        if (activeSession.length === 0) {
            redirect("/login")
        }

        const currentUser = await db
            .select({ role: users.role })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1)

        if (currentUser.length === 0) {
            redirect("/login")
        }

        if (currentUser[0].role !== "GlobalAdmin") {
            redirect("/403")
        }
    } catch {
        redirect("/login")
    }
}

export default async function RolesPage({ searchParams }: RolesPageProps) {
    await assertRolesPageAccess()

    const params = await searchParams
    const selectedRole = normalizeSelectedRole(params.role)

    const initialUsers = await db
        .select({
            id: users.id,
            name: users.name,
            email: users.email,
            department: users.department,
            role: users.role,
        })
        .from(users)
        .orderBy(asc(users.name))
        .limit(100)

    const roleCounts: Record<UserRole, number> = {
        GlobalAdmin: 0,
        ITOperator: 0,
        FinanceAuditor: 0,
        Employee: 0,
    }

    for (const user of initialUsers) {
        roleCounts[user.role] += 1
    }

    const usersInRole = initialUsers.filter((user) => user.role === selectedRole)
    const selectedRoleInfo = ROLE_CONFIG.find((role) => role.id === selectedRole) ?? ROLE_CONFIG[1]

    return (
        <div className="flex min-h-0 flex-1 flex-col items-stretch gap-2.5 bg-muted lg:flex-row">
            <section className="flex w-full flex-col items-start gap-4 rounded-lg bg-white p-6 shadow-box-shadow-shadow-sm lg:max-w-100">
                <h1 className="font-text-2xl-semi-bold text-(length:--text-2xl-semi-bold-font-size) leading-(--text-2xl-semi-bold-line-height) tracking-(--text-2xl-semi-bold-letter-spacing) text-slate-900 [font-style:var(--text-2xl-semi-bold-font-style)]">
                    Role Assignment
                </h1>

                <div className="w-full space-y-3">
                    {ROLE_CONFIG.map((role) => {
                        const isActive = selectedRole === role.id

                        return (
                            <Link
                                key={role.id}
                                href={`/settings/roles?role=${role.id}`}
                                className={[
                                    "flex w-full flex-col items-center gap-6 rounded-lg border border-slate-200 px-0 py-6 shadow-box-shadow-shadow-sm transition-colors",
                                    isActive ? "bg-slate-50" : "bg-white hover:bg-slate-50/50",
                                ].join(" ")}
                            >
                                <div className="flex w-full items-center gap-2.5 px-6 py-0">
                                    <span className={`flex-1 text-left text-slate-900 ${textBaseSemiBoldClass}`}>
                                        {role.name}
                                    </span>

                                    <div className="inline-flex h-5.5 items-center justify-center gap-1 rounded-lg border border-blue-800 bg-white px-1.5 py-0.5">
                                        <span className={`${textSmMediumClass} text-blue-800`}>
                                            {roleCounts[role.id]} Users
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        )
                    })}
                </div>
            </section>

            <section className="flex min-h-0 flex-1 flex-col items-start gap-2.5 rounded-lg bg-white p-6 shadow-box-shadow-shadow-sm">
                <h2 className="text-slate-900">
                    <span className="font-text-lg-semi-bold text-(length:--text-lg-semi-bold-font-size) leading-(--text-lg-semi-bold-line-height) tracking-(--text-lg-semi-bold-letter-spacing) [font-style:var(--text-lg-semi-bold-font-style)]">
                        Users in{" "}
                    </span>
                    <span className="font-text-lg-bold text-(length:--text-lg-bold-font-size) leading-(--text-lg-bold-line-height) tracking-(--text-lg-bold-letter-spacing) [font-style:var(--text-lg-bold-font-style)]">
                        {selectedRoleInfo.name}
                    </span>
                </h2>

                <div className="flex w-full flex-col items-start justify-between gap-3 lg:flex-row lg:items-center">
                    <p className={`max-w-175 text-slate-900 ${textSmRegularClass}`}>
                        {selectedRoleInfo.description}
                    </p>

                    <RolesAddUserButton
                        selectedRole={selectedRole}
                        mappedUsers={usersInRole}
                    />
                </div>

                <RolesManagementTable users={usersInRole} roleLabel={selectedRoleInfo.name} />
            </section>
        </div>
    )
}
