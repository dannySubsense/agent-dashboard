import type { CacheEntry } from '@/types';

export const CACHE_TTL_MS = 60_000;

class InMemoryCache {
  private store: Map<string, CacheEntry<unknown>>;

  constructor() {
    this.store = new Map();
  }

  get<T>(key: string): CacheEntry<T> | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    return entry as CacheEntry<T>;
  }

  set<T>(key: string, data: T, ttlMs: number = CACHE_TTL_MS): void {
    this.store.set(key, {
      data,
      fetchedAt: Date.now(),
      ttlMs,
    });
  }

  isValid<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.fetchedAt < entry.ttlMs;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

export const cache = new InMemoryCache();
