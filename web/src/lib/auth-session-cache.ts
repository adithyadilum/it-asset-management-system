import type { UserRole } from "@/types/auth"
import { TtlCache } from "@/lib/ttl-cache"

export type CachedAuthUser = {
  id: string
  email: string
  name: string
  role: UserRole
} | null

const TTL_MS = 5_000

declare global {
  // eslint-disable-next-line no-var
  var __authSessionCache: TtlCache<CachedAuthUser> | undefined
}

export const authSessionCache =
  globalThis.__authSessionCache ??
  new TtlCache<CachedAuthUser>(TTL_MS, { maxEntries: 10_000, cleanupBatchSize: 100 })

if (process.env.NODE_ENV !== "production") {
  globalThis.__authSessionCache = authSessionCache
}

export function buildAuthCacheKey(input: { sid: string; sub: string }) {
  return `${input.sub}:${input.sid}`
}