import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { db } from '@/db'
import { apiKeys } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { logAuditAction } from '@/lib/audit'
import { applyRateLimit, injectRateLimitHeaders } from '@/lib/api/rate-limiter'

type ApiKeyRecord = {
  id: string
  name: string
  keyHash: string
  isRevoked: boolean
  expiresAt: Date | null
  scopes: string[]
  createdById: string
}

export function withApiKey(
  requiredScope: string,
  handler: (req: NextRequest, ctx: { apiKey: ApiKeyRecord }) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      const authHeader = req.headers.get('authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 })
      }

      const token = authHeader.slice(7)
      const hash = createHash('sha256').update(token).digest('hex')

      const found = await db.query.apiKeys.findFirst({ where: eq(apiKeys.keyHash, hash) }) as ApiKeyRecord | undefined
      if (!found) return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
      if (found.isRevoked) return NextResponse.json({ error: 'API key has been revoked' }, { status: 401 })
      if (found.expiresAt && new Date(found.expiresAt) < new Date()) return NextResponse.json({ error: 'API key has expired' }, { status: 401 })

      if (!Array.isArray(found.scopes) || !found.scopes.includes(requiredScope)) {
        return NextResponse.json({ error: `Insufficient permissions. Required: ${requiredScope}` }, { status: 403 })
      }

      const rl = await applyRateLimit(found.id)
      if (!rl.success) {
        const resp = NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
        injectRateLimitHeaders(resp, rl)
        return resp
      }

      // fire-and-forget updates
      void db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, found.id))

      void logAuditAction({
        entityType: 'ExternalApi',
        entityId: req.nextUrl.pathname,
        actionType: 'EXTERNAL_API_ACCESS',
        performedById: found.createdById,
        newData: { apiKeyName: found.name, scope: requiredScope, method: req.method },
      })

      const response = await handler(req, { apiKey: found })
      injectRateLimitHeaders(response, rl)
      return response
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }
}
