import { NextRequest, NextResponse } from 'next/server';
import { unstable_rethrow } from 'next/navigation';
import { createHash } from 'node:crypto';
import { db } from '@/db';
import { apiKeys } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { logAuditAction } from '@/lib/audit';
import { applyRateLimit, injectRateLimitHeaders } from '@/lib/api/rate-limiter';
import type { ApiKeyScope } from '@/types/integrations';

export type ApiKeyRecord = {
  id: string;
  name: string;
  keyHash: string;
  isRevoked: boolean;
  expiresAt: Date | null;
  scopes: ApiKeyScope[];
  createdById: string;
};

type ExternalApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'INVALID_API_KEY'
  | 'REVOKED_API_KEY'
  | 'EXPIRED_API_KEY'
  | 'INTERNAL_ERROR';

function apiError(status: number, code: ExternalApiErrorCode, message: string) {
  return NextResponse.json(
    {
      success: false,
      error: { code, message },
    },
    { status }
  );
}

export function withApiKey<TContext extends Record<string, unknown>>(
  requiredScope: ApiKeyScope,
  handler: (
    req: NextRequest,
    ctx: TContext & { apiKey: ApiKeyRecord }
  ) => Promise<NextResponse>
) {
  return async (req: NextRequest, ctx: TContext) => {
    try {
      const authHeader = req.headers.get('authorization');
      const apiKeyHeader = req.headers.get('x-api-key');

      let token = '';
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7).trim();
      } else if (apiKeyHeader) {
        token = apiKeyHeader.trim();
      }

      if (!token) {
        return apiError(
          401,
          'UNAUTHORIZED',
          'Missing or invalid API key. Provide via Authorization header as a Bearer token or via x-api-key header.'
        );
      }
      const hash = createHash('sha256').update(token).digest('hex');

      const found = (await db.query.apiKeys.findFirst({
        where: eq(apiKeys.keyHash, hash),
      })) as ApiKeyRecord | undefined;
      if (!found) return apiError(401, 'INVALID_API_KEY', 'Invalid API key');
      if (found.isRevoked)
        return apiError(401, 'REVOKED_API_KEY', 'API key has been revoked');
      if (found.expiresAt && new Date(found.expiresAt) < new Date())
        return apiError(401, 'EXPIRED_API_KEY', 'API key has expired');

      if (
        !Array.isArray(found.scopes) ||
        !found.scopes.includes(requiredScope)
      ) {
        return apiError(
          403,
          'FORBIDDEN',
          `Insufficient permissions. Required: ${requiredScope}`
        );
      }

      const forwardedFor = req.headers.get('x-forwarded-for');
      const firstIp = forwardedFor ? forwardedFor.split(',')[0].trim() : '';
      const clientIp = firstIp || req.headers.get('x-real-ip') || 'unknown';
      const rlIdentifier = `${found.id}:${clientIp}`;
      const rl = await applyRateLimit(rlIdentifier);
      if (!rl.success) {
        const resp = apiError(429, 'RATE_LIMITED', 'Rate limit exceeded');
        injectRateLimitHeaders(resp, rl);
        return resp;
      }

      // fire-and-forget updates
      void db
        .update(apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiKeys.id, found.id))
        .catch((err) =>
          console.error('Failed to update API key lastUsedAt:', err)
        );

      void logAuditAction({
        entityType: 'ExternalApi',
        entityId: req.nextUrl.pathname,
        actionType: 'EXTERNAL_API_ACCESS',
        performedById: found.createdById,
        newData: {
          apiKeyName: found.name,
          scope: requiredScope,
          method: req.method,
        },
      }).catch((err) =>
        console.error(
          'Failed to log audit action for external API access:',
          err
        )
      );

      const response = await handler(req, { ...ctx, apiKey: found });
      injectRateLimitHeaders(response, rl);
      return response;
    } catch (err) {
      unstable_rethrow(err);
      console.error('Unhandled fault in withApiKey middleware:', err);
      return apiError(500, 'INTERNAL_ERROR', 'Internal server error');
    }
  };
}
