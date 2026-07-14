import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthenticatedMobileUserFromRequest } from '@/lib/auth/get-authenticated-user';

/**
 * GET /api/v1/profile
 *
 * Returns the currently authenticated user's profile details.
 */
export async function GET(req: Request) {
  // --- 1. Authenticate via mobile JWT ---
  const authenticatedUser = await getAuthenticatedMobileUserFromRequest(req);
  if (!authenticatedUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = authenticatedUser.id;

  // --- 2. Fetch User Profile ---
  try {
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ data: user });
  } catch (error) {
    console.error('[GET /api/v1/profile] DB error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
