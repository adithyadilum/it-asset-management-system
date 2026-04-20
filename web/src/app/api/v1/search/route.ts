import { and, asc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import { jwtVerify } from 'jose';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { db } from '@/db';
import {
  assets,
  categories,
  departments,
  models,
  sessions,
  systemAuditLogs,
  users,
} from '@/db/schema';
import { getJwtSecretKey } from '@/lib/jwt';
import { logError, logLatency, startLatencyTimer } from '@/lib/latency';
import { isValidUuid } from '@/lib/uuid';
import { omniSearchQuerySchema } from '@/lib/validations/omni-search';
import type { UserRole } from '@/types/auth';
import type {
  OmniSearchAssetResult,
  OmniSearchReportResult,
  OmniSearchResponse,
  OmniSearchUserResult,
} from '@/types/omni-search';

const SESSION_COOKIE_NAME = 'session_token';
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
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    const userId = payload.sub;
    const sessionId = payload.sid;

    if (!isValidUuid(userId)) {
      return null;
    }

    if (typeof sessionId !== 'string') {
      return null;
    }

    const role = normalizeTokenRole(payload.role);
    if (!role) {
      return null;
    }

    let activeSession: Array<{ id: number }> = [];
    const sessionLookupTimer = startLatencyTimer();
    try {
      activeSession = await db
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
        .limit(1);
    } finally {
      logLatency({
        scope: 'DB ACTION',
        label: 'search.getAuthenticatedSearchUser.session_lookup',
        startTime: sessionLookupTimer,
      });
    }

    if (activeSession.length === 0) {
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
        or(
          ilike(assets.assetTag, containsQuery),
          ilike(assets.name, containsQuery),
          ilike(assets.serialNumber, containsQuery)
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

async function searchUsersByQuery(query: string): Promise<OmniSearchUserResult[]> {
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
          or(ilike(users.name, containsQuery), ilike(users.email, containsQuery))
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
    const [softwareCountRows, attentionCountRows, auditCountRows] =
      await Promise.all([
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(assets)
          .innerJoin(models, eq(assets.modelId, models.id))
          .innerJoin(categories, eq(models.categoryId, categories.id))
          .where(eq(categories.pillar, 'Software'))
          .limit(1),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(assets)
          .where(inArray(assets.status, ['In Repair', 'Defective', 'Lost']))
          .limit(1),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(systemAuditLogs)
          .limit(1),
      ]);

    const softwareAssetsCount = softwareCountRows[0]?.count ?? 0;
    const attentionAssetsCount = attentionCountRows[0]?.count ?? 0;
    const auditEventsCount = auditCountRows[0]?.count ?? 0;

    const reportCandidates: OmniSearchReportResult[] = [
      {
        id: 'report-software-compliance',
        label: 'Software Compliance Report',
        description: `${softwareAssetsCount} software assets tracked`,
        href: '/reports',
      },
      {
        id: 'report-overdue-assets',
        label: 'Overdue Assets Report',
        description: `${attentionAssetsCount} assets require attention`,
        href: '/reports',
      },
      {
        id: 'report-audit-activity',
        label: 'Audit Activity Report',
        description: `${auditEventsCount} logged audit events`,
        href: '/reports/audit-log',
      },
    ];

    return reportCandidates
      .filter((reportCandidate) => {
        if (!normalizedQuery) {
          return true;
        }

        const haystack = `${reportCandidate.label} ${reportCandidate.description}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      .slice(0, MAX_RESULTS_PER_GROUP);
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
      return NextResponse.json({ error: 'Invalid search query.' }, { status: 400 });
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
