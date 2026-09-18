import { Injectable } from '@angular/core';

export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  updatedAt: number;
}

/**
 * Persistent localStorage + in-memory cache used by reports tabs to avoid re-fetching data
 * that was already loaded within a specified TTL (default 1 hour).
 * Persists across page navigation and page reloads.
 *
 * Cache key convention: `${tabId}:${from}:${to}`
 * Storage prefix: `drivoo_tab_cache:`
 * Default TTL: 1 hour (3_600_000 ms)
 */
@Injectable({ providedIn: 'root' })
export class TabCacheService {
  private readonly memoryStore = new Map<string, CacheEntry<unknown>>();
  private readonly DEFAULT_TTL_MS = 3_600_000; // 1 hour
  private readonly STORAGE_PREFIX = 'drivoo_tab_cache:';
  private readonly isLocalStorageAvailable: boolean;

  constructor() {
    this.isLocalStorageAvailable = this.checkLocalStorage();
    if (this.isLocalStorageAvailable) {
      this.cleanExpired();
    }
  }

  private checkLocalStorage(): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }
      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  private getStorageKey(key: string): string {
    return `${this.STORAGE_PREFIX}${key}`;
  }

  /** Returns cached data if it exists and has not expired, otherwise null. */
  get<T>(key: string): T | null {
    const entry = this.getEntry<T>(key);
    return entry ? entry.data : null;
  }

  /** Returns the full cache entry including metadata (updatedAt, expiresAt) if valid, otherwise null. */
  getWithMeta<T>(key: string): CacheEntry<T> | null {
    return this.getEntry<T>(key);
  }

  /** Returns the Date when the key was last updated/saved, or null if not in cache or expired. */
  getLastUpdated(key: string): Date | null {
    const entry = this.getEntry<unknown>(key);
    return entry ? new Date(entry.updatedAt) : null;
  }

  /** Returns the timestamp (ms) when the key was last updated/saved, or null if not in cache or expired. */
  getLastUpdatedTimestamp(key: string): number | null {
    const entry = this.getEntry<unknown>(key);
    return entry ? entry.updatedAt : null;
  }

  /**
   * Internal helper to fetch entry from memory or localStorage,
   * validating expiration and updating memory cache.
   */
  private getEntry<T>(key: string): CacheEntry<T> | null {
    const now = Date.now();

    // 1. Check in-memory store first
    let entry = this.memoryStore.get(key) as CacheEntry<T> | undefined;

    // 2. If not in memory, try localStorage
    if (!entry && this.isLocalStorageAvailable) {
      try {
        const raw = window.localStorage.getItem(this.getStorageKey(key));
        if (raw) {
          entry = JSON.parse(raw) as CacheEntry<T>;
        }
      } catch (e) {
        console.warn('TabCacheService: Failed to read from localStorage', e);
      }
    }

    if (!entry) return null;

    // 3. Check expiration
    if (now > entry.expiresAt) {
      this.invalidate(key);
      return null;
    }

    // Keep in-memory cache synchronized
    this.memoryStore.set(key, entry);

    return entry;
  }

  /** Stores data under the given key for `ttlMs` milliseconds with the current timestamp. */
  set<T>(key: string, data: T, ttlMs = this.DEFAULT_TTL_MS): void {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      updatedAt: now,
      expiresAt: now + ttlMs,
    };

    // Save to memory
    this.memoryStore.set(key, entry);

    // Save to localStorage
    if (this.isLocalStorageAvailable) {
      try {
        window.localStorage.setItem(
          this.getStorageKey(key),
          JSON.stringify(entry)
        );
      } catch (e) {
        console.warn('TabCacheService: Failed to write to localStorage', e);
      }
    }
  }

  /** Removes a single cache entry from memory and localStorage. */
  invalidate(key: string): void {
    this.memoryStore.delete(key);
    if (this.isLocalStorageAvailable) {
      try {
        window.localStorage.removeItem(this.getStorageKey(key));
      } catch (e) {
        console.warn('TabCacheService: Failed to remove from localStorage', e);
      }
    }
  }

  /** Removes all entries whose key starts with `tabId:` from memory and localStorage. */
  invalidateTab(tabId: string): void {
    const prefix = `${tabId}:`;
    for (const key of Array.from(this.memoryStore.keys())) {
      if (key.startsWith(prefix)) {
        this.memoryStore.delete(key);
      }
    }

    if (this.isLocalStorageAvailable) {
      try {
        const storagePrefix = this.getStorageKey(prefix);
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith(storagePrefix)) {
            keysToRemove.push(k);
          }
        }
        for (const k of keysToRemove) {
          window.localStorage.removeItem(k);
        }
      } catch (e) {
        console.warn('TabCacheService: Failed to invalidate tab in localStorage', e);
      }
    }
  }

  /** Removes all tab cache entries from memory and localStorage. */
  clear(): void {
    this.memoryStore.clear();
    if (this.isLocalStorageAvailable) {
      try {
        const prefix = this.STORAGE_PREFIX;
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith(prefix)) {
            keysToRemove.push(k);
          }
        }
        for (const k of keysToRemove) {
          window.localStorage.removeItem(k);
        }
      } catch (e) {
        console.warn('TabCacheService: Failed to clear localStorage', e);
      }
    }
  }

  /** Cleans up expired entries from localStorage. */
  private cleanExpired(): void {
    if (!this.isLocalStorageAvailable) return;
    try {
      const prefix = this.STORAGE_PREFIX;
      const now = Date.now();
      const keysToRemove: string[] = [];

      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(prefix)) {
          const raw = window.localStorage.getItem(k);
          if (raw) {
            try {
              const entry = JSON.parse(raw);
              if (entry.expiresAt && now > entry.expiresAt) {
                keysToRemove.push(k);
              }
            } catch {
              keysToRemove.push(k);
            }
          }
        }
      }

      for (const k of keysToRemove) {
        window.localStorage.removeItem(k);
      }
    } catch (e) {
      console.warn('TabCacheService: Failed to cleanup expired items', e);
    }
  }

  /** Builds the canonical cache key for a tab + date range. */
  static key(tabId: string, from: string, to: string): string {
    return `${tabId}:${from}:${to}`;
  }
}
