import { NextRequest, NextResponse } from 'next/server';
import { and, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { users, departments } from '@/db/schema';
import { withApiKey } from '@/lib/api/with-api-key';
import { apiError, parseBoundedInt } from '@/lib/api/utils';


export const GET = withApiKey('read:users', async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;

    const limitResult = parseBoundedInt(searchParams.get('limit'), 50, 1, 200);
    if (!limitResult.ok) {
      return apiError(400, 'INVALID_PARAM', 'limit must be an integer between 1 and 200');
    }

    const offsetResult = parseBoundedInt(searchParams.get('offset'), 0, 0, Number.MAX_SAFE_INTEGER);
    if (!offsetResult.ok) {
      return apiError(400, 'INVALID_PARAM', 'offset must be a non-negative integer');
    }

    const query = searchParams.get('q')?.trim() || '';

    // Build query conditions
    const conditions = [];
    if (query) {
      conditions.push(
        or(
          ilike(users.name, `%${query}%`),
          ilike(users.email, `%${query}%`)
        )
      );
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Fetch total count
    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(whereClause ?? sql`true`);
    const total = countRow?.count ?? 0;

    // Fetch paginated user directory
    const data = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        department: {
          id: departments.id,
          name: departments.name,
          shortCode: departments.shortCode,
          costCenterId: departments.costCenterId,
        },
      })
      .from(users)
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .where(whereClause ?? sql`true`)
      .orderBy(users.name)
      .limit(limitResult.value)
      .offset(offsetResult.value);

    return NextResponse.json(
      {
        success: true,
        data,
        pagination: {
          limit: limitResult.value,
          offset: offsetResult.value,
          total,
          returned: data.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/v1/external/users error:', error);
    return apiError(500, 'INTERNAL_ERROR', 'Internal server error');
  }
});
