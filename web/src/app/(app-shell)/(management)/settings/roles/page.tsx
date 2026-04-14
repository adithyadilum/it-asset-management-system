import { jwtVerify } from "jose"
import { and, asc, eq, isNull, sql } from "drizzle-orm"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { RolesManagementTable } from "./roles-management-table"
import { db } from "@/db"
import { sessions, users } from "@/db/schema"
import { getJwtSecretKey } from "@/lib/jwt"

const SESSION_COOKIE_NAME = "session_token"

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

export default async function RolesPage() {
  await assertRolesPageAccess()

  const initialUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .orderBy(asc(users.name))
    .limit(100)

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">User Roles & Access</h1>
        <p className="mt-2 text-sm text-slate-600">
          Assign and review permissions for system users.
        </p>
      </div>

      <RolesManagementTable initialUsers={initialUsers} />
    </div>
  )
}
