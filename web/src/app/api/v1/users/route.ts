import { and, asc, eq, ilike, or } from 'drizzle-orm';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { db } from '@/db';
import { users } from '@/db/schema';
import {
  canManageAssets,
  getAuthenticatedUser,
} from '@/lib/auth/get-authenticated-user';

const MAX_RESULTS = 20;

export async function GET(request: NextRequest) {
  const currentUser = await getAuthenticatedUser();

  if (!currentUser) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (!canManageAssets(currentUser.role)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const query = request.nextUrl.searchParams.get('search')?.trim() ?? '';

  const baseFilter = eq(users.isActive, true);
  const whereCondition = query
    ? and(
        baseFilter,
        or(
          ilike(users.name, `%${query}%`),
          ilike(users.email, `%${query}%`)
        )
      )
    : baseFilter;


  const result = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .where(whereCondition)
    .orderBy(asc(users.name))
    .limit(MAX_RESULTS);

  return NextResponse.json({ data: result }, { status: 200 });
}
