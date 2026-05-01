'use server';

import { and, asc, eq, ilike, sql } from 'drizzle-orm';

import { db } from '@/db';
import { users } from '@/db/schema';
import { getAuthenticatedUser } from '@/actions/auth';
import { canManageAssets } from '@/lib/auth/roles';
import { logError, logLatency, startLatencyTimer } from '@/lib/latency';

const MAX_RESULTS = 20;

export interface UserSearchResult {
  id: string;
  name: string;
  email: string;
}

export interface UsersActionResult {
  success: boolean;
  data?: UserSearchResult[];
  error?: string;
}

function forbiddenResult(message: string): UsersActionResult {
  return {
    success: false,
    error: message,
  };
}

/**
 * Search users by name or email
 * @param query - Optional search query to filter users by name or email
 * @returns Array of users matching the query
 */
export async function searchUsers(
  query: string = ''
): Promise<UsersActionResult> {
  const actionTimer = startLatencyTimer();
  const currentUser = await getAuthenticatedUser();

  if (!currentUser) {
    return forbiddenResult('Unauthorized: Please sign in.');
  }

  if (!canManageAssets(currentUser.role)) {
    return forbiddenResult(
      'Forbidden: You do not have permission to search users.'
    );
  }

  try {
    const trimmedQuery = query.trim();
    const filters = [eq(users.isActive, true)];

    if (trimmedQuery) {
      filters.push(
        sql<boolean>`(${ilike(users.name, `%${trimmedQuery}%`)}) OR (${ilike(users.email, `%${trimmedQuery}%`)})`
      );
    }

    const result = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(and(...filters))
      .orderBy(asc(users.name))
      .limit(MAX_RESULTS);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    logError({
      scope: 'ACTION',
      label: 'users.searchUsers',
      error,
      metadata: { query },
    });

    return {
      success: false,
      error: 'Unexpected error while searching users.',
    };
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'users.searchUsers',
      startTime: actionTimer,
    });
  }
}
