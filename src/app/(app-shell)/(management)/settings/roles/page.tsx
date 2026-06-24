import Link from 'next/link';
import { asc, eq, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';

import { getAuthenticatedUser } from '@/actions/auth';
import { db } from '@/db';
import { departments, users } from '@/db/schema';
import type { UserRole } from '@/types/auth';

import { RolesManagementTable } from '../../../../../components/features/roles/roles-management-table';

const ROLE_CONFIG: Array<{
  id: UserRole;
  name: string;
  description: string;
}> = [
    {
      id: 'GlobalAdmin',
      name: 'Global Admin',
      description: 'These users manage all system settings and role assignments.',
    },
    {
      id: 'ITOperator',
      name: 'IT Operations',
      description:
        'These users have full read/write access to the Asset Registry and Maintenance modules.',
    },
    {
      id: 'FinanceAuditor',
      name: 'Financial Auditor',
      description:
        'These users have read-only access to financial ledgers and audit records.',
    },
    {
      id: 'Employee',
      name: 'Employee',
      description:
        'Standard users who can view their assigned assets and submit requests.',
    },
  ];

const textSmRegularClass =
  'font-text-sm-regular text-(length:--text-sm-regular-font-size) leading-(--text-sm-regular-line-height) tracking-(--text-sm-regular-letter-spacing) [font-style:var(--text-sm-regular-font-style)]';
const textSmMediumClass =
  'font-text-sm-medium text-(length:--text-sm-medium-font-size) leading-(--text-sm-medium-line-height) tracking-(--text-sm-medium-letter-spacing) [font-style:var(--text-sm-medium-font-style)]';
const textBaseSemiBoldClass =
  'font-text-base-semi-bold text-(length:--text-base-semi-bold-font-size) leading-(--text-base-semi-bold-line-height) tracking-(--text-base-semi-bold-letter-spacing) [font-style:var(--text-base-semi-bold-font-style)]';

type RolesPageProps = {
  searchParams: Promise<{
    role?: string | string[];
  }>;
};

function normalizeSelectedRole(value: string | string[] | undefined): UserRole {
  const selected = Array.isArray(value) ? value[0] : value;

  if (
    selected === 'GlobalAdmin' ||
    selected === 'ITOperator' ||
    selected === 'FinanceAuditor' ||
    selected === 'Employee'
  ) {
    return selected;
  }

  return 'GlobalAdmin';
}

export default async function RolesPage({ searchParams }: RolesPageProps) {
  const currentUser = await getAuthenticatedUser();

  if (!currentUser) {
    redirect('/login');
  }

  if (currentUser.role !== 'GlobalAdmin') {
    redirect('/403');
  }

  const params = await searchParams;
  const selectedRole = normalizeSelectedRole(params.role);

  const [usersInRole, roleCountsRows] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        department: sql<string>`coalesce(${departments.name}, 'Unassigned')`,
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .where(eq(users.role, selectedRole))
      .orderBy(asc(users.name))
      .limit(100),

    // Count users per role using the DB (fast + small payload)
    db
      .select({
        role: users.role,
        count: sql<number>`count(*)::int`,
      })
      .from(users)
      .groupBy(users.role),
  ]);

  const roleCounts: Record<UserRole, number> = {
    GlobalAdmin: 0,
    ITOperator: 0,
    FinanceAuditor: 0,
    Employee: 0,
  };

  for (const row of roleCountsRows) {
    roleCounts[row.role] = row.count;
  }

  const selectedRoleInfo =
    ROLE_CONFIG.find((role) => role.id === selectedRole) ?? ROLE_CONFIG[1];

  return (
    <div className="flex min-h-0 flex-1 flex-col items-stretch gap-2.5 bg-muted lg:flex-row">
      <section className="flex w-full flex-col items-start gap-4 rounded-lg bg-card text-card-foreground p-6 shadow-box-shadow-shadow-sm lg:max-w-100 border border-border">
        <h1 className="font-text-2xl-semi-bold text-(length:--text-2xl-semi-bold-font-size) leading-(--text-2xl-semi-bold-line-height) tracking-(--text-2xl-semi-bold-letter-spacing) [font-style:var(--text-text-2xl-semi-bold-font-style,var(--text-2xl-semi-bold-font-style))]">
          Role Assignment
        </h1>

        <div className="w-full space-y-3">
          {ROLE_CONFIG.map((role) => {
            const isActive = selectedRole === role.id;

            return (
              <Link
                key={role.id}
                href={`/settings/roles?role=${role.id}`}
                className={[
                  'flex w-full flex-col items-center gap-6 rounded-lg border border-border px-0 py-6 transition-colors shadow-none text-foreground',
                  isActive ? 'bg-muted' : 'bg-transparent hover:bg-muted/50',
                ].join(' ')}
              >
                <div className="flex w-full items-center gap-2.5 px-6 py-0">
                  <span
                    className={`flex-1 text-left ${textBaseSemiBoldClass}`}
                  >
                    {role.name}
                  </span>

                  <div className="inline-flex h-5.5 items-center justify-center gap-1 rounded-lg border border-primary bg-transparent px-1.5 py-0.5">
                    <span className={`${textSmMediumClass} text-primary`}>
                      {roleCounts[role.id]} Users
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="flex min-h-0 flex-1 flex-col items-start gap-2.5 rounded-lg bg-card text-card-foreground p-6 shadow-box-shadow-shadow-sm border border-border">
        <h2>
          <span className="font-text-lg-semi-bold text-(length:--text-lg-semi-bold-font-size) leading-(--text-lg-semi-bold-line-height) tracking-(--text-lg-semi-bold-letter-spacing) [font-style:var(--text-lg-semi-bold-font-style)]">
            Users in{' '}
          </span>
          <span className="font-text-lg-bold text-(length:--text-lg-bold-font-size) leading-(--text-lg-bold-line-height) tracking-(--text-lg-bold-letter-spacing) [font-style:var(--text-lg-bold-font-style)]">
            {selectedRoleInfo.name}
          </span>
        </h2>

        <div className="flex w-full flex-col items-start justify-between gap-3 lg:flex-row lg:items-center">
          <p className={`max-w-175 text-muted-foreground ${textSmRegularClass}`}>
            {selectedRoleInfo.description}
          </p>
        </div>

        <RolesManagementTable
          users={usersInRole}
          roleLabel={selectedRoleInfo.name}
          currentUserId={currentUser.id}
          selectedRole={selectedRole}
        />
      </section>
    </div>
  );
}