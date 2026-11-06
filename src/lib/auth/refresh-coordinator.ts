import type { JWT } from 'next-auth/jwt';
import { TtlCache } from '@/lib/ttl-cache';
import { REFRESH_RETRY_BACKOFF_MS } from './session-liveness';

/** Coalesces this worker's refreshes; the DB advisory lock still protects peers. */
export class RefreshCoordinator {
  private readonly inFlight = new Map<string, Promise<JWT>>();
  private readonly retries = new TtlCache<number>(REFRESH_RETRY_BACKOFF_MS);

  async run(token: JWT, refresh: (token: JWT) => Promise<JWT>): Promise<JWT> {
    const id = token.id as string;
    const retryAt = this.retries.get(id);
    if (retryAt && retryAt > Date.now())
      return { ...token, error: undefined, refreshRetryAt: retryAt };
    const pending = this.inFlight.get(id) ?? refresh(token);
    this.inFlight.set(id, pending);
    try {
      const result = await pending;
      if (typeof result.refreshRetryAt === 'number')
        this.retries.set(id, result.refreshRetryAt);
      else this.retries.delete(id);
      return {
        ...token,
        accessToken: result.accessToken,
        idToken: result.idToken,
        refreshToken: result.refreshToken,
        accessTokenExpires: result.accessTokenExpires,
        isActive: result.isActive,
        error: result.error,
        refreshRetryAt: result.refreshRetryAt,
      };
    } finally {
      if (this.inFlight.get(id) === pending) this.inFlight.delete(id);
    }
  }

  clear(): void {
    this.retries.clear();
    this.inFlight.clear();
  }
}

const globalRefresh = globalThis as typeof globalThis & {
  eitamsRefreshCoordinator?: RefreshCoordinator;
};
export const refreshCoordinator = (globalRefresh.eitamsRefreshCoordinator ??=
  new RefreshCoordinator());
