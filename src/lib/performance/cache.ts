/**
 * High-performance caching layer for API responses
 * Implements multiple caching strategies to improve TTFB and overall performance
 */

import { NextResponse } from 'next/server';

// Memory cache for frequently accessed data
interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  expires: number;
  key: string;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize = 1000; // Maximum number of entries
  
  set<T>(key: string, data: T, ttlMs = 300000): void { // Default 5 minutes
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expires: Date.now() + ttlMs,
      key
    });
  }
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  // Get cache statistics for monitoring
  getStats() {
    const now = Date.now();
    const entries = Array.from(this.cache.values());
    const expired = entries.filter(entry => now > entry.expires).length;
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      expired,
      hitRate: this.hitCount / (this.hitCount + this.missCount) || 0
    };
  }
  
  private hitCount = 0;
  private missCount = 0;
}

// Global memory cache instance
const memoryCache = new MemoryCache();

// Cache key generators for different types of data
export const CacheKeys = {
  sessions: (userId: string, filters: string) => `sessions:${userId}:${filters}`,
  reflections: (userId: string, filters: string) => `reflections:${userId}:${filters}`,
  sessionWidget: (userId: string, params: string) => `widget:sessions:${userId}:${params}`,
  userProfile: (userId: string) => `profile:${userId}`,
  sessionDetails: (sessionId: string) => `session:${sessionId}`,
  coachNotes: (sessionId: string) => `notes:${sessionId}`,
  dashboardStats: (userId: string, timeframe: string) => `stats:${userId}:${timeframe}`
};

// Cache TTL configurations (in milliseconds)
export const CacheTTL = {
  SHORT: 60000,      // 1 minute - for frequently changing data
  MEDIUM: 300000,    // 5 minutes - for session lists, reflections
  LONG: 900000,      // 15 minutes - for user profiles, static data
  DASHBOARD: 180000, // 3 minutes - for dashboard widgets
  USER_PROFILE: 600000 // 10 minutes - for user profile data
};

// Response caching middleware with ETag support
export function withCache<T = any>(
  key: string, 
  ttlMs = CacheTTL.MEDIUM,
  generateETag?: (data: T) => string
) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args: any[]) {
      const request = args.find(arg => arg?.nextUrl);
      
      // Check memory cache first
      const cached = memoryCache.get<{data: T, etag?: string}>(key);
      if (cached) {
        // Check ETag if provided
        if (cached.etag && request?.headers.get('if-none-match') === cached.etag) {
          return new NextResponse(null, { status: 304 });
        }
        
        const response = NextResponse.json(cached.data);
        if (cached.etag) {
          response.headers.set('ETag', cached.etag);
        }
        response.headers.set('Cache-Control', `public, max-age=${Math.floor(ttlMs / 1000)}`);
        return response;
      }
      
      // Execute original method
      const result = await originalMethod.apply(this, args);
      
      if (result.ok) {
        const data = await result.clone().json();
        const etag = generateETag ? generateETag(data) : undefined;
        
        // Cache the response
        memoryCache.set(key, { data, etag }, ttlMs);
        
        // Add cache headers
        if (etag) {
          result.headers.set('ETag', etag);
        }
        result.headers.set('Cache-Control', `public, max-age=${Math.floor(ttlMs / 1000)}`);
      }
      
      return result;
    };
    
    return descriptor;
  };
}

// Async cache with background refresh
export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = CacheTTL.MEDIUM,
  refreshThreshold = 0.8 // Refresh when 80% of TTL is reached
): Promise<T> {
  const cached = memoryCache.get<CacheEntry<T>>(key);
  
  if (cached) {
    const age = Date.now() - cached.timestamp;
    const shouldRefresh = age > (ttlMs * refreshThreshold);
    
    if (shouldRefresh) {
      // Background refresh - return cached data immediately
      fetcher().then(data => {
        memoryCache.set(key, data, ttlMs);
      }).catch(console.error);
    }
    
    return cached.data;
  }
  
  // No cached data - fetch and cache
  const data = await fetcher();
  memoryCache.set(key, data, ttlMs);
  return data;
}

// Batch cache operations for reducing database queries
export class BatchCache {
  private pending = new Map<string, Promise<any>>();
  
  async batch<T>(
    keys: string[], 
    fetcher: (keys: string[]) => Promise<Map<string, T>>,
    ttlMs = CacheTTL.MEDIUM
  ): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    const uncachedKeys: string[] = [];
    
    // Check cache for each key
    for (const key of keys) {
      const cached = memoryCache.get<T>(key);
      if (cached) {
        results.set(key, cached);
      } else if (!this.pending.has(key)) {
        uncachedKeys.push(key);
      }
    }
    
    // Fetch uncached data in batch
    if (uncachedKeys.length > 0) {
      // Deduplicate concurrent requests
      const batchKey = uncachedKeys.sort().join(',');
      if (!this.pending.has(batchKey)) {
        this.pending.set(batchKey, fetcher(uncachedKeys));
      }
      
      try {
        const fetchedData = await this.pending.get(batchKey)!;
        
        // Cache individual results
        for (const [key, value] of fetchedData.entries()) {
          memoryCache.set(key, value, ttlMs);
          results.set(key, value);
        }
      } finally {
        this.pending.delete(batchKey);
      }
    }
    
    return results;
  }
}

// Cache invalidation utilities
export const CacheInvalidation = {
  user: (userId: string) => {
    const patterns = [
      `sessions:${userId}:`,
      `reflections:${userId}:`,
      `widget:sessions:${userId}:`,
      `profile:${userId}`,
      `stats:${userId}:`
    ];
    
    patterns.forEach(pattern => {
      Array.from(memoryCache['cache'].keys())
        .filter(key => key.startsWith(pattern))
        .forEach(key => memoryCache.delete(key));
    });
  },
  
  session: (sessionId: string, userId?: string) => {
    memoryCache.delete(`session:${sessionId}`);
    memoryCache.delete(`notes:${sessionId}`);
    
    if (userId) {
      CacheInvalidation.user(userId);
    }
  },
  
  all: () => {
    memoryCache.clear();
  }
};

// Performance monitoring
export const CacheMetrics = {
  getStats: () => memoryCache.getStats(),
  
  getHealthCheck: () => {
    const stats = memoryCache.getStats();
    return {
      healthy: stats.hitRate > 0.7, // Consider healthy if hit rate > 70%
      stats,
      recommendations: stats.hitRate < 0.5 ? 
        ['Consider increasing cache TTL', 'Review cache key strategies'] : []
    };
  }
};

export { memoryCache };