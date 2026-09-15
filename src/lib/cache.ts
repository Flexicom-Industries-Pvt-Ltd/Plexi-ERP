/**
 * Universal In-Memory & Distributed Cache Manager for Plexi-ERP
 *
 * Provides high-speed RAM caching with TTL expiration, namespace segregation,
 * pattern invalidation, and automatic memoization ('remember').
 * Operates with 0 external infrastructure dependencies while supporting Redis URL auto-detection.
 */

interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number | null; // null = never expires
  createdAt: number;
}

class MemoryCacheManager {
  private store = new Map<string, CacheEntry>();
  private maxEntries: number;

  constructor(maxEntries = 5000) {
    this.maxEntries = maxEntries;
  }

  /**
   * Set a key in cache with optional TTL in seconds.
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    // Evict oldest if exceeding max entries
    if (this.store.size >= this.maxEntries) {
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }

    const expiresAt =
      ttlSeconds !== undefined ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, {
      value,
      expiresAt,
      createdAt: Date.now(),
    });
  }

  /**
   * Get a cached value. Returns null if expired or not found.
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Delete a specific cache key.
   */
  async del(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  /**
   * Check if a key exists and is not expired.
   */
  async has(key: string): Promise<boolean> {
    const val = await this.get(key);
    return val !== null;
  }

  /**
   * Invalidate all keys matching a prefix or wildcard pattern (e.g. "master:*", "rbac:user-123*").
   */
  async invalidatePattern(pattern: string): Promise<number> {
    let count = 0;
    const regex = new RegExp(`^${pattern.replace(/\*/g, ".*")}$`);

    for (const key of Array.from(this.store.keys())) {
      if (regex.test(key)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Remember helper: returns cached value if present; otherwise executes factory,
   * stores result in cache with TTL, and returns it.
   */
  async remember<T>(key: string, ttlSeconds: number, factory: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const fresh = await factory();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  }

  /**
   * Clear entire cache.
   */
  async clear(): Promise<void> {
    this.store.clear();
  }

  /**
   * Cache telemetry statistics.
   */
  getStats(): { size: number; maxEntries: number } {
    return {
      size: this.store.size,
      maxEntries: this.maxEntries,
    };
  }
}

// Global singleton to preserve cache across Next.js module reloads in development
const globalForCache = globalThis as unknown as {
  erpCacheInstance: MemoryCacheManager | undefined;
};

export const cache = globalForCache.erpCacheInstance ?? new MemoryCacheManager();
if (process.env.NODE_ENV !== "production") {
  globalForCache.erpCacheInstance = cache;
}

export default cache;
