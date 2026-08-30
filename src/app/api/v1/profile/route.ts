import { NextResponse } from 'next/server';
import { withMobileAuth } from '@/lib/api/with-auth';
import { canAccessMobile } from '@/lib/auth/roles';

/**
 * GET /api/v1/profile
 *
 * Returns the currently authenticated user's profile details.
 *
 * The authenticated principal already carries these columns, so no further
 * query is issued. `deviceId` and `jwtId` are deliberately not serialized.
 */
export const GET = withMobileAuth(canAccessMobile, async (_req, { user }) => {
  const { id, name, email, role } = user;

  return NextResponse.json({ data: { id, name, email, role } });
});
