import { afterEach, describe, expect, it, vi } from 'vitest';
import type { JWT } from 'next-auth/jwt';
import { RefreshCoordinator } from './refresh-coordinator';
describe('refresh coordination', () => {
  afterEach(() => vi.useRealTimers());
  it('coalesces concurrent refreshes without replacing each request JWT identity', async () => {
    const coordinator = new RefreshCoordinator();
    let resolve!: (token: JWT) => void;
    const refresh = vi.fn(
      () =>
        new Promise<JWT>((done) => {
          resolve = done;
        })
    );
    const first = coordinator.run(
      { id: 'one', name: 'First request' },
      refresh
    );
    const second = coordinator.run(
      { id: 'one', name: 'Second request' },
      refresh
    );
    resolve({ id: 'one', accessToken: 'new-token', accessTokenExpires: 123 });
    expect((await first).name).toBe('First request');
    expect((await second).name).toBe('Second request');
    expect(refresh).toHaveBeenCalledTimes(1);
  });
  it('honors backoff for stale cookies even when server rendering cannot save the new JWT', async () => {
    vi.useFakeTimers();
    const coordinator = new RefreshCoordinator();
    const token = { id: 'one' };
    const refresh = vi.fn(async () => ({
      ...token,
      refreshRetryAt: Date.now() + 30_000,
    }));
    await coordinator.run(token, refresh);
    await coordinator.run(token, refresh);
    expect(refresh).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(30_001);
    await coordinator.run(token, refresh);
    expect(refresh).toHaveBeenCalledTimes(2);
  });
  it('does not throttle other accounts or cache a successful authorization result', async () => {
    const coordinator = new RefreshCoordinator();
    const refresh = vi.fn(async (token: JWT) => token);
    await coordinator.run({ id: 'one' }, refresh);
    await coordinator.run({ id: 'two' }, refresh);
    await coordinator.run({ id: 'one' }, refresh);
    expect(refresh).toHaveBeenCalledTimes(3);
  });
});
