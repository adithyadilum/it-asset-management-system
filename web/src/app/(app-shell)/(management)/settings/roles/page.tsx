import { asc } from "drizzle-orm"

import { RolesManagementTable } from "./roles-management-table"
import { db } from "@/db"
import { users } from "@/db/schema"

export default async function RolesPage() {
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
