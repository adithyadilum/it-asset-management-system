import { and, asc, eq, ilike, inArray, or, sql, ne } from 'drizzle-orm';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { db } from '@/db';
import {
  assets,
  categories,
  departments,
  models,
  systemAuditLogs,
  users,
} from '@/db/schema';
import { logError, logLatency, startLatencyTimer } from '@/lib/latency';
import { omniSearchQuerySchema } from '@/lib/validations/omni-search';
import type { UserRole } from '@/types/auth';
import type {
  OmniSearchAssetResult,
  OmniSearchReportResult,
  OmniSearchResponse,
  OmniSearchUserResult,
} from '@/types/omni-search';

const MAX_RESULTS_PER_GROUP = 8;

function normalizeTokenRole(role: unknown): UserRole | null {
  if (
    role === 'GlobalAdmin' ||
    role === 'ITOperator' ||
    role === 'FinanceAuditor' ||
    role === 'Employee'
  ) {
    return role;
  }

  return null;
}

function canSearchAssets(role: UserRole) {
  return role !== 'Employee';
}

function canSearchUsers(role: UserRole) {
  return role === 'GlobalAdmin';
}

function canSearchReports(role: UserRole) {
  return role !== 'Employee';
}

async function getAuthenticatedSearchUser(
  request: NextRequest
): Promise<{ id: string; role: UserRole } | null> {
  const authTimer = startLatencyTimer();

  try {
    const token = await getToken({ req: request });

    if (!token) {
      return null;
    }

    const userId = token.id as string | undefined;
    const role = normalizeTokenRole(token.role);

    if (!userId || !role) {
      return null;
    }

    return {
      id: userId,
      role,
    };
  } catch {
    return null;
  } finally {
    logLatency({
      scope: 'ACTION AUTH',
      label: 'search.getAuthenticatedSearchUser',
      startTime: authTimer,
    });
  }
}

async function searchAssetsByQuery(
  query: string
): Promise<OmniSearchAssetResult[]> {
  const queryTimer = startLatencyTimer();
  const exactQuery = query;
  const startsWithQuery = `${query}%`;
  const containsQuery = `%${query}%`;

  try {
    const rankExpression = sql<number>`
      case
        when ${assets.assetTag} ilike ${exactQuery} then 0
        when ${assets.assetTag} ilike ${startsWithQuery} then 1
        when ${assets.name} ilike ${startsWithQuery} then 2
        when ${assets.serialNumber} ilike ${startsWithQuery} then 3
        else 4
      end
    `;

    const rows = await db
      .select({
        id: assets.id,
        assetTag: assets.assetTag,
        name: assets.name,
        serialNumber: assets.serialNumber,
        category: sql<string>`coalesce(${categories.name}, 'Uncategorized')`,
      })
      .from(assets)
      .innerJoin(models, eq(assets.modelId, models.id))
      .leftJoin(categories, eq(models.categoryId, categories.id))
      .where(
        and(
          ne(assets.status, 'Disposed'),
          or(
            ilike(assets.assetTag, containsQuery),
            ilike(assets.name, containsQuery),
            ilike(assets.serialNumber, containsQuery)
          )
        )
      )
      .orderBy(rankExpression, asc(assets.assetTag))
      .limit(MAX_RESULTS_PER_GROUP);

    return rows;
  } finally {
    logLatency({
      scope: 'DB ACTION',
      label: 'search.searchAssetsByQuery',
      startTime: queryTimer,
      metadata: {
        queryLength: query.length,
      },
    });
  }
}

async function searchUsersByQuery(
  query: string
): Promise<OmniSearchUserResult[]> {
  const queryTimer = startLatencyTimer();
  const exactQuery = query;
  const startsWithQuery = `${query}%`;
  const containsQuery = `%${query}%`;

  try {
    const rankExpression = sql<number>`
      case
        when ${users.email} ilike ${exactQuery} then 0
        when ${users.email} ilike ${startsWithQuery} then 1
        when ${users.name} ilike ${startsWithQuery} then 2
        else 3
      end
    `;

    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        department: sql<string>`coalesce(${departments.name}, 'Unassigned')`,
      })
      .from(users)
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .where(
        and(
          eq(users.isActive, true),
          or(
            ilike(users.name, containsQuery),
            ilike(users.email, containsQuery)
          )
        )
      )
      .orderBy(rankExpression, asc(users.name))
      .limit(MAX_RESULTS_PER_GROUP);

    return rows;
  } finally {
    logLatency({
      scope: 'DB ACTION',
      label: 'search.searchUsersByQuery',
      startTime: queryTimer,
      metadata: {
        queryLength: query.length,
      },
    });
  }
}

async function searchReportsByQuery(
  query: string
): Promise<OmniSearchReportResult[]> {
  const queryTimer = startLatencyTimer();
  const normalizedQuery = query.trim().toLowerCase();

  try {
    const reportCandidates = [
      {
        id: 'report-software-compliance',
        label: 'Software Compliance Report',
        description: 'software assets tracked',
        href: '/reports',
        needsSoftwareCount: true,
      },
      {
        id: 'report-overdue-assets',
        label: 'Overdue Assets Report',
        description: 'assets require attention',
        href: '/reports',
        needsAttentionCount: true,
      },
      {
        id: 'report-audit-activity',
        label: 'Audit Activity Report',
        description: 'logged audit events',
        href: '/reports/audit-log',
        needsAuditCount: true,
      },
    ];

    const matchedReports = reportCandidates.filter((report) => {
      if (!normalizedQuery) return true;
      const haystack = `${report.label} ${report.description}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });

    if (matchedReports.length === 0) {
      return [];
    }

    const queries: Promise<{ count: number }[]>[] = [];
    const reportQueryMapping: { index: number; id: string }[] = [];

    matchedReports.forEach((report) => {
      if (report.needsSoftwareCount) {
        queries.push(
          db
            .select({ count: sql<number>`count(*)::int` })
            .from(assets)
            .innerJoin(models, eq(assets.modelId, models.id))
            .innerJoin(categories, eq(models.categoryId, categories.id))
            .where(eq(categories.pillar, 'Software'))
            .limit(1)
        );
        reportQueryMapping.push({ index: queries.length - 1, id: report.id });
      } else if (report.needsAttentionCount) {
        queries.push(
          db
            .select({ count: sql<number>`count(*)::int` })
            .from(assets)
            .where(inArray(assets.status, ['In Repair', 'Defective', 'Lost']))
            .limit(1)
        );
        reportQueryMapping.push({ index: queries.length - 1, id: report.id });
      } else if (report.needsAuditCount) {
        queries.push(
          db
            .select({ count: sql<number>`count(*)::int` })
            .from(systemAuditLogs)
            .limit(1)
        );
        reportQueryMapping.push({ index: queries.length - 1, id: report.id });
      }
    });

    const results = await Promise.all(queries);

    return matchedReports.map((report) => {
      const mapping = reportQueryMapping.find((m) => m.id === report.id);
      const count = mapping ? (results[mapping.index]?.[0]?.count ?? 0) : 0;
      return {
        id: report.id,
        label: report.label,
        description: `${count} ${report.description}`,
        href: report.href,
      };
    }).slice(0, MAX_RESULTS_PER_GROUP);
  } finally {
    logLatency({
      scope: 'DB ACTION',
      label: 'search.searchReportsByQuery',
      startTime: queryTimer,
      metadata: {
        queryLength: query.length,
      },
    });
  }
}

export async function GET(request: NextRequest) {
  const requestTimer = startLatencyTimer();

  try {
    const parsedInput = omniSearchQuerySchema.safeParse({
      q: request.nextUrl.searchParams.get('q') ?? '',
    });

    if (!parsedInput.success) {
      return NextResponse.json(
        { error: 'Invalid search query.' },
        { status: 400 }
      );
    }

    const query = parsedInput.data.q;
    if (!query) {
      const emptyResponse: OmniSearchResponse = {
        query: '',
        assets: [],
        users: [],
        reports: [],
      };

      return NextResponse.json(emptyResponse, { status: 200 });
    }

    const currentUser = await getAuthenticatedSearchUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [assetResults, userResults, reportResults] = await Promise.all([
      canSearchAssets(currentUser.role)
        ? searchAssetsByQuery(query)
        : Promise.resolve<OmniSearchAssetResult[]>([]),
      canSearchUsers(currentUser.role)
        ? searchUsersByQuery(query)
        : Promise.resolve<OmniSearchUserResult[]>([]),
      canSearchReports(currentUser.role)
        ? searchReportsByQuery(query)
        : Promise.resolve<OmniSearchReportResult[]>([]),
    ]);

    const responseBody: OmniSearchResponse = {
      query,
      assets: assetResults,
      users: userResults,
      reports: reportResults,
    };

    return NextResponse.json(responseBody, { status: 200 });
  } catch (error) {
    logError({
      scope: 'API',
      label: 'search.GET',
      error,
    });

    return NextResponse.json(
      { error: 'Failed to complete search request.' },
      { status: 500 }
    );
  } finally {
    logLatency({
      scope: 'API',
      label: '/api/v1/search',
      startTime: requestTimer,
      metadata: {
        queryLength: request.nextUrl.searchParams.get('q')?.length ?? 0,
      },
    });
  }
}
