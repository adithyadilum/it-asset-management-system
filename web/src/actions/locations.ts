'use server';

import { and, asc, eq, ilike } from 'drizzle-orm';

import { db } from '@/db';
import { locations } from '@/db/schema';
import { getAuthenticatedUser } from '@/actions/auth';
import { canManageAssets } from '@/lib/auth/roles';
import { logError, logLatency, startLatencyTimer } from '@/lib/latency';

const MAX_RESULTS = 20;

export interface LocationSearchResult {
  id: number;
  name: string;
}

export interface LocationsActionResult {
  success: boolean;
  data?: LocationSearchResult[];
  error?: string;
}

function forbiddenResult(message: string): LocationsActionResult {
  return {
    success: false,
    error: message,
  };
}

/**
 * Search locations by name
 * @param query - Optional search query to filter locations by name
 * @returns Array of locations matching the query
 */
export async function searchLocations(
  query: string = ''
): Promise<LocationsActionResult> {
  const actionTimer = startLatencyTimer();
  const currentUser = await getAuthenticatedUser();

  if (!currentUser) {
    return forbiddenResult('Unauthorized: Please sign in.');
  }

  if (!canManageAssets(currentUser.role)) {
    return forbiddenResult(
      'Forbidden: You do not have permission to search locations.'
    );
  }

  try {
    const trimmedQuery = query.trim();
    const filters = [eq(locations.isActive, true)];

    if (trimmedQuery) {
      filters.push(ilike(locations.name, `%${trimmedQuery}%`));
    }

    const result = await db
      .select({
        id: locations.id,
        name: locations.name,
      })
      .from(locations)
      .where(and(...filters))
      .orderBy(asc(locations.name))
      .limit(MAX_RESULTS);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    logError({
      scope: 'ACTION',
      label: 'locations.searchLocations',
      error,
      metadata: { query },
    });

    return {
      success: false,
      error: 'Unexpected error while searching locations.',
    };
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'locations.searchLocations',
      startTime: actionTimer,
    });
  }
}
