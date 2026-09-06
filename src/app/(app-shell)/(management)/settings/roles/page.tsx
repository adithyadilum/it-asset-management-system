import { Suspense } from 'react';
import { PageSkeleton } from '@/components/shared/page-skeleton';
import Link from 'next/link';
import { requirePageAuth } from '@/lib/auth/page-guard';
import { getRolesPageData } from '@/actions/roles';
import { USER_ROLES } from '@/types/auth';
import type { UserRole } from '@/types/auth';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';

import { RolesManagementTable } from '../../../../../components/features/roles/roles-management-table';

/**
 * No instant shell is possible here: the `(app-shell)` layout above blocks on
 * `connection()` to read the session, so nothing on this route can be
 * prerendered. Without this Next reports "Could not validate `instant`" on
 * every visit — the layout's config does not cascade to pages.
 */
export const instant = false;

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
    id: 'FinancialAuditor',
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

type RolesPageProps = {
  searchParams: Promise<{
    role?: string | string[];
  }>;
};

const VALID_ROLES = new Set<string>(USER_ROLES);

/** Extracts and validates the ?role= query param, defaulting to GlobalAdmin. */
function normalizeSelectedRole(value: string | string[] | undefined): UserRole {
  const selected = Array.isArray(value) ? value[0] : (value ?? '');
  return VALID_ROLES.has(selected) ? (selected as UserRole) : 'GlobalAdmin';
}

async function RolesPageContent({ searchParams }: RolesPageProps) {
  const currentUser = await requirePageAuth((role) => role === 'GlobalAdmin');

  const params = await searchParams;
  const selectedRole = normalizeSelectedRole(params.role);

  const { usersInRole, roleCountsRows } = await getRolesPageData(selectedRole);

  const roleCounts: Record<UserRole, number> = {
    GlobalAdmin: 0,
    ITOperator: 0,
    FinancialAuditor: 0,
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
        <h1
          className={`${TYPOGRAPHY_CLASSNAMES.text2xlSemiBold} text-foreground`}
        >
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
                    className={`flex-1 text-left ${TYPOGRAPHY_CLASSNAMES.textBaseSemiBold}`}
                  >
                    {role.name}
                  </span>

                  <div className="inline-flex h-5.5 items-center justify-center gap-1 rounded-lg border border-primary bg-transparent px-1.5 py-0.5">
                    <span
                      className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-primary`}
                    >
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
          <span className={TYPOGRAPHY_CLASSNAMES.textLgSemiBold}>
            Users in{' '}
          </span>
          <span className={TYPOGRAPHY_CLASSNAMES.textLgBold}>
            {selectedRoleInfo.name}
          </span>
        </h2>

        <div className="flex w-full flex-col items-start justify-between gap-3 lg:flex-row lg:items-center">
          <p
            className={`max-w-175 text-muted-foreground ${TYPOGRAPHY_CLASSNAMES.textSmRegular}`}
          >
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

/**
 * Streams rather than blocks.
 *
 * The body above reads the session and queries the database, none of
 * which can be prerendered. Keeping the default export synchronous lets
 * this route paint its chrome immediately and fill in the content when
 * the data arrives, instead of the navigation waiting on the slowest
 * query.
 */
export default function RolesPage(props: RolesPageProps) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RolesPageContent {...props} />
    </Suspense>
  );
}
