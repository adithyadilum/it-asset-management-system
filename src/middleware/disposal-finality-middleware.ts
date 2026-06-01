import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { getToken } from 'next-auth/jwt';

import { db } from '@/db';
import { assets } from '@/db/schema';
import { logAuditAction } from '@/lib/audit';
import { logError } from '@/lib/latency';
import { isValidUuid } from '@/lib/auth/uuid';

/**
 * DISPOSAL FINALITY GUARD
 *
 * Blocks write operations (PUT, PATCH, DELETE) on finalized assets.
 * Intended to be called from Node.js runtime (route handlers or server actions),
 * NOT from Next.js Edge middleware (due to database access requirements).
 *
 * When called from a route handler, this guard:
 * 1. Checks if the asset is disposed or archived
 * 2. Returns 403 Forbidden if finalized
 * 3. Logs the denied access attempt for compliance audit trails
 * 4. Fails securely (503) on unexpected errors (Zero Trust pattern)
 *
 * Example usage in a route handler:
 * ```
 * const response = await disposalFinalityMiddleware(request);
 * if (response.status === 403) return response;
 * // Proceed with modification
 * ```
 */
export async function disposalFinalityMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method.toUpperCase();

  // Only intercept PUT, PATCH, DELETE requests to asset endpoints
  // Pattern: /api/v1/assets/{id}/*
  const assetApiMatch = pathname.match(
    /^\/api\/v1\/assets\/([a-f0-9-]+)(?:\/.*)?$/i
  );

  if (!assetApiMatch || !['PUT', 'PATCH', 'DELETE'].includes(method)) {
    return NextResponse.next();
  }

  const assetId = assetApiMatch[1];

  // Validate UUID format before querying database
  if (!isValidUuid(assetId)) {
    console.debug(
      `[disposalFinalityMiddleware] Invalid asset ID format: ${assetId}`
    );
    return NextResponse.next();
  }

  try {
    // Fetch asset status and archival state
    const asset = await db.query.assets.findFirst({
      where: eq(assets.id, assetId),
      columns: {
        id: true,
        status: true,
        isArchived: true,
        assetTag: true,
      },
    });

    if (!asset) {
      // If asset doesn't exist, let the route handler handle the 404
      return NextResponse.next();
    }

    const isDisposed = asset.status === 'Disposed';
    const isArchived = asset.isArchived === true;

    if (isDisposed || isArchived) {
      // Identify the user for the audit trail
      const token = await getToken({ req: request });
      let userId: string | null = null;

      if (token) {
        const sub = token.id as string | undefined;
        if (sub && isValidUuid(sub)) {
          userId = sub;
        }
      }

      // Security Audit Trail (only log if we have a valid user UUID)
      // This prevents database constraint violations from string IDs
      if (userId) {
        await logAuditAction({
          entityType: 'Asset',
          entityId: assetId,
          actionType: 'ACCESS_DENIED',
          performedById: userId,
          newData: {
            reason:
              'Attempted to modify a finalized record (Disposed or Archived)',
            assetTag: asset.assetTag,
            method,
            pathname,
          },
        });
      }

      return new NextResponse(
        JSON.stringify({
          error: 'Forbidden',
          message: 'Record is finalized',
          details: isDisposed ? 'Asset is disposed' : 'Asset is archived',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    logError({
      scope: 'DISPOSAL_FINALITY_GUARD',
      label: 'unexpected_error_checking_record_finality',
      error,
      metadata: {
        assetId: assetId || 'unknown',
        method,
        pathname,
      },
    });

    // On unexpected errors (DB failures, etc.), deny the request to maintain Zero Trust
    // This ensures we fail securely rather than allowing potentially dangerous operations
    return new NextResponse(
      JSON.stringify({
        error: 'Service Unavailable',
        message: 'Unable to verify record finality status. Please try again.',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  return NextResponse.next();
}
