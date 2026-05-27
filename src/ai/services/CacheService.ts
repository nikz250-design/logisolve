// ============================================================
// Logisolve AI Layer — Response Cache
// In-memory LRU-style cache. Prevents duplicate API calls for
// identical inputs within the TTL window.
// ============================================================

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  hitCount: number;
}

export class CacheService<T = unknown> {
  private store = new Map<string, CacheEntry<T>>();
  private maxEntries: number;
  private ttlMs: number;

  constructor(opts: { maxEntries?: number; ttlMs?: number } = {}) {
    this.maxEntries = opts.maxEntries ?? 100;
    this.ttlMs = opts.ttlMs ?? 5 * 60 * 1000; // 5 min default
  }

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    entry.hitCount++;
    return entry.value;
  }

  set(key: string, value: T): void {
    if (this.store.size >= this.maxEntries) {
      // Evict oldest entry
      const oldest = [...this.store.entries()].sort(
        (a, b) => a[1].expiresAt - b[1].expiresAt
      )[0];
      if (oldest) this.store.delete(oldest[0]);
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
      hitCount: 0,
    });
  }

  /** Canonical cache key from prompt inputs */
  static keyFor(prefix: string, data: unknown): string {
    const str = JSON.stringify(data);
    // Simple djb2 hash
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    }
    return `${prefix}:${(hash >>> 0).toString(16)}`;
  }

  stats() {
    let totalHits = 0;
    let active = 0;
    const now = Date.now();
    for (const e of this.store.values()) {
      if (now < e.expiresAt) {
        active++;
        totalHits += e.hitCount;
      }
    }
    return { active, totalHits, maxEntries: this.maxEntries };
  }

  clear() {
    this.store.clear();
  }
}

// Shared instance for operational analysis
export const analysisCache = new CacheService<unknown>({
  maxEntries: 50,
  ttlMs: 10 * 60 * 1000, // 10 min
});
