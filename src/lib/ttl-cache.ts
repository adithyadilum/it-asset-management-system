type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

type TtlCacheOptions = {
  maxEntries?: number;
  // Cleanup at most this many expired keys per set() call
  cleanupBatchSize?: number;
};

export class TtlCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private readonly cleanupBatchSize: number;

  constructor(ttlMs: number, options: TtlCacheOptions = {}) {
    this.ttlMs = ttlMs;
    this.maxEntries = options.maxEntries ?? 5_000;
    this.cleanupBatchSize = options.cleanupBatchSize ?? 50;
  }

  private getValidEntry(key: string): CacheEntry<T> | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry;
  }

  has(key: string): boolean {
    return this.getValidEntry(key) !== undefined;
  }

  get(key: string): T | undefined {
    return this.getValidEntry(key)?.value;
  }

  private cleanupExpiredOnSet() {
    // Opportunistic cleanup: remove some expired entries so the map doesn't grow forever.
    let checked = 0;
    for (const [key, entry] of this.store) {
      if (Date.now() > entry.expiresAt) {
        this.store.delete(key);
      }
      checked += 1;
      if (checked >= this.cleanupBatchSize) {
        break;
      }
    }
  }

  set(key: string, value: T) {
    this.cleanupExpiredOnSet();

    // Soft cap: if we're at/over maxEntries, clear the whole cache (simple + safe).
    // For auth caching this is fine; correctness > perfect eviction strategy.
    if (this.store.size >= this.maxEntries) {
      this.store.clear();
    }

    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  delete(key: string) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}
