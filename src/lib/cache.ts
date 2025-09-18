/**
 * Comprehensive caching system for DeFi dashboard
 * Supports both localStorage (persistent) and memory (session) caching
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  version: string;
}

export interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  useLocalStorage: boolean;
  useMemoryCache: boolean;
  version: string;
}

export class CacheManager {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private readonly version = '1.0.0';

  // Default cache configurations for different data types
  private readonly configs: Record<string, CacheConfig> = {
    tokenPrices: {
      ttl: 2 * 60 * 1000, // 2 minutes
      useLocalStorage: true,
      useMemoryCache: true,
      version: this.version
    },
    pools: {
      ttl: 5 * 60 * 1000, // 5 minutes
      useLocalStorage: true,
      useMemoryCache: true,
      version: this.version
    },
    tokenHistorical: {
      ttl: 10 * 60 * 1000, // 10 minutes
      useLocalStorage: true,
      useMemoryCache: true,
      version: this.version
    },
    poolHistorical: {
      ttl: 15 * 60 * 1000, // 15 minutes
      useLocalStorage: true,
      useMemoryCache: true,
      version: this.version
    }
  };

  /**
   * Get data from cache with fallback hierarchy: memory -> localStorage
   */
  get<T>(key: string, category: string = 'default'): T | null {
    const config = this.configs[category] || this.configs.tokenPrices;
    const fullKey = `${category}:${key}`;

    try {
      // Try memory cache first (fastest)
      if (config.useMemoryCache && this.memoryCache.has(fullKey)) {
        const entry = this.memoryCache.get(fullKey)!;
        if (this.isValid(entry)) {
          console.log(`Cache HIT (memory): ${fullKey}`);
          return entry.data;
        } else {
          this.memoryCache.delete(fullKey);
        }
      }

      // Try localStorage (persistent across sessions)
      if (config.useLocalStorage && typeof window !== 'undefined') {
        const stored = localStorage.getItem(fullKey);
        if (stored) {
          const entry: CacheEntry<T> = JSON.parse(stored);
          if (this.isValid(entry)) {
            console.log(`Cache HIT (localStorage): ${fullKey}`);
            // Promote to memory cache for faster future access
            if (config.useMemoryCache) {
              this.memoryCache.set(fullKey, entry);
            }
            return entry.data;
          } else {
            localStorage.removeItem(fullKey);
          }
        }
      }

      console.log(`Cache MISS: ${fullKey}`);
      return null;
    } catch (error) {
      console.warn(`Cache get error for ${fullKey}:`, error);
      return null;
    }
  }

  /**
   * Set data in cache with automatic expiration
   */
  set<T>(key: string, data: T, category: string = 'default'): void {
    const config = this.configs[category] || this.configs.tokenPrices;
    const fullKey = `${category}:${key}`;
    const now = Date.now();
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + config.ttl,
      version: config.version
    };

    try {
      // Store in memory cache
      if (config.useMemoryCache) {
        this.memoryCache.set(fullKey, entry);
        console.log(`Cache SET (memory): ${fullKey}`);
      }

      // Store in localStorage
      if (config.useLocalStorage && typeof window !== 'undefined') {
        localStorage.setItem(fullKey, JSON.stringify(entry));
        console.log(`Cache SET (localStorage): ${fullKey}`);
      }
    } catch (error) {
      console.warn(`Cache set error for ${fullKey}:`, error);
    }
  }

  /**
   * Check if a cache entry is still valid
   */
  private isValid<T>(entry: CacheEntry<T>): boolean {
    const now = Date.now();
    const isNotExpired = now < entry.expiresAt;
    const isCorrectVersion = entry.version === this.version;
    
    return isNotExpired && isCorrectVersion;
  }

  /**
   * Get cached data or fetch with automatic caching
   */
  async getOrFetch<T>(
    key: string, 
    fetchFn: () => Promise<T>, 
    category: string = 'default'
  ): Promise<T> {
    // Try to get from cache first
    const cached = this.get<T>(key, category);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    console.log(`Fetching fresh data for: ${category}:${key}`);
    const data = await fetchFn();
    
    // Cache the result
    this.set(key, data, category);
    
    return data;
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string, category: string = 'default'): void {
    const fullKey = `${category}:${key}`;
    
    // Remove from memory cache
    this.memoryCache.delete(fullKey);
    
    // Remove from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(fullKey);
    }
    
    console.log(`Cache INVALIDATED: ${fullKey}`);
  }

  /**
   * Clear all cache entries for a category
   */
  clearCategory(category: string): void {
    // Clear memory cache
    const memoryKeys = Array.from(this.memoryCache.keys()).filter(key => 
      key.startsWith(`${category}:`)
    );
    memoryKeys.forEach(key => this.memoryCache.delete(key));

    // Clear localStorage
    if (typeof window !== 'undefined') {
      const storageKeys = Object.keys(localStorage).filter(key => 
        key.startsWith(`${category}:`)
      );
      storageKeys.forEach(key => localStorage.removeItem(key));
    }

    console.log(`Cache category CLEARED: ${category}`);
  }

  /**
   * Clear all expired entries (cleanup)
   */
  cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    // Clean memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (!this.isValid(entry)) {
        this.memoryCache.delete(key);
        cleanedCount++;
      }
    }

    // Clean localStorage
    if (typeof window !== 'undefined') {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes(':')) {
          try {
            const stored = localStorage.getItem(key);
            if (stored) {
              const entry = JSON.parse(stored);
              if (!this.isValid(entry)) {
                keysToRemove.push(key);
              }
            }
          } catch (error) {
            // Invalid JSON, remove it
            keysToRemove.push(key);
          }
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        cleanedCount++;
      });
    }

    if (cleanedCount > 0) {
      console.log(`Cache cleanup: removed ${cleanedCount} expired entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    memoryEntries: number;
    localStorageEntries: number;
    totalSize: string;
  } {
    const memoryEntries = this.memoryCache.size;
    let localStorageEntries = 0;
    let totalSize = 0;

    if (typeof window !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes(':')) {
          localStorageEntries++;
          const value = localStorage.getItem(key);
          if (value) {
            totalSize += new Blob([value]).size;
          }
        }
      }
    }

    return {
      memoryEntries,
      localStorageEntries,
      totalSize: `${(totalSize / 1024).toFixed(2)} KB`
    };
  }
}

// Singleton instance
export const cacheManager = new CacheManager();

// Auto-cleanup on page load
if (typeof window !== 'undefined') {
  // Clean up expired entries on page load
  setTimeout(() => cacheManager.cleanup(), 1000);
  
  // Clean up expired entries every 5 minutes
  setInterval(() => cacheManager.cleanup(), 5 * 60 * 1000);
}