import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/actions/auth';
import type { AuthenticatedUser } from '@/actions/auth';
import type { UserRole } from '@/types/auth';

/**
 * Server-side page guard. Call at the top of any async Server Component page.
 *
 * - Redirects to /login if the user is not authenticated.
 * - Redirects to /403 if `canAccess` is provided and returns false for the user's role.
 * - Returns the authenticated user so it can be used by the page component.
 *
 * @example
 * // No role restriction — just require login
 * const user = await requirePageAuth();
 *
 * @example
 * // Restrict to GlobalAdmin only
 * const user = await requirePageAuth((role) => role === 'GlobalAdmin');
 *
 * @example
 * // Use an existing role predicate from @/lib/auth/roles
 * const user = await requirePageAuth(canManageAssets);
 */
export async function requirePageAuth(
  canAccess?: (role: UserRole) => boolean,
): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect('/login');
  }

  if (canAccess && !canAccess(user.role)) {
    redirect('/403');
  }

  return user;
}
