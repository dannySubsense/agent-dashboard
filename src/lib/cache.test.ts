/**
 * Acceptance criteria covered (US-10 — In-Memory Response Caching):
 * - cache.get returns null on empty cache
 * - cache.set then cache.get returns entry with correct data
 * - cache.isValid returns true immediately after set
 * - cache.isValid returns false after TTL expires
 * - cache.clear empties the cache
 * - cache.set overwrites an existing key
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cache } from './cache';
import type { CacheEntry } from '@/types';

beforeEach(() => {
  cache.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('cache.get', () => {
  it('returns null on an empty cache', () => {
    const result = cache.get<number>('x');
    expect(result).toBeNull();
  });
});

describe('cache.set / cache.get', () => {
  it('returns the entry with correct data after set', () => {
    cache.set('x', 42);
    const entry = cache.get<number>('x');

    expect(entry).not.toBeNull();
    expect(entry!.data).toBe(42);
  });

  it('overwrites an existing key with the new value', () => {
    cache.set('x', 'first');
    cache.set('x', 'second');

    const entry = cache.get<string>('x');
    expect(entry!.data).toBe('second');
  });
});

describe('cache.isValid', () => {
  it('returns true immediately after set', () => {
    cache.set('x', 42);
    const entry = cache.get<number>('x') as CacheEntry<number>;

    expect(cache.isValid(entry)).toBe(true);
  });

  it('returns false after TTL expires', () => {
    const baseTime = 1_000_000;
    const ttlMs = 100;
    const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(baseTime);

    cache.set('x', 42, ttlMs);
    const entry = cache.get<number>('x') as CacheEntry<number>;

    // Advance time beyond TTL
    dateSpy.mockReturnValue(baseTime + ttlMs + 1);

    expect(cache.isValid(entry)).toBe(false);
  });
});

describe('cache.clear', () => {
  it('empties the cache so get returns null after clear', () => {
    cache.set('x', 42);
    cache.set('y', 'hello');

    cache.clear();

    expect(cache.get<number>('x')).toBeNull();
    expect(cache.get<string>('y')).toBeNull();
  });
});
