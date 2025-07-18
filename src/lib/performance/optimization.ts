import { NextRequest, NextResponse } from 'next/server';
import React from 'react';

// Cache configuration
export const CACHE_CONFIG = {
  // Static assets
  STATIC_ASSETS: {
    maxAge: 31536000, // 1 year
    staleWhileRevalidate: 86400, // 1 day
  },
  // API responses
  API_RESPONSES: {
    maxAge: 300, // 5 minutes
    staleWhileRevalidate: 60, // 1 minute
  },
  // Page content
  PAGE_CONTENT: {
    maxAge: 3600, // 1 hour
    staleWhileRevalidate: 300, // 5 minutes
  },
  // User-specific content
  USER_CONTENT: {
    maxAge: 60, // 1 minute
    staleWhileRevalidate: 30, // 30 seconds
  },
};

// Cache headers utility
export const setCacheHeaders = (
  response: NextResponse,
  config: { maxAge: number; staleWhileRevalidate: number }
) => {
  response.headers.set(
    'Cache-Control',
    `public, max-age=${config.maxAge}, s-maxage=${config.maxAge}, stale-while-revalidate=${config.staleWhileRevalidate}`
  );
  return response;
};

// Response compression
export const compressResponse = (data: unknown): string => {
  return JSON.stringify(data, null, 0);
};

// Image optimization helper
export const getOptimizedImageUrl = (
  src: string,
  width: number,
  height?: number,
  quality: number = 80
): string => {
  const url = new URL(src, process.env.NEXT_PUBLIC_APP_URL);
  url.searchParams.set('w', width.toString());
  if (height) {
    url.searchParams.set('h', height.toString());
  }
  url.searchParams.set('q', quality.toString());
  return url.toString();
};

// Lazy loading utility
export const createLazyLoader = (threshold: number = 0.1) => {
  if (typeof window === 'undefined') return null;

  return new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const target = entry.target as HTMLElement;
          target.dataset.loaded = 'true';
          
          // Trigger load event
          const event = new CustomEvent('lazy-load', {
            detail: { element: target },
          });
          target.dispatchEvent(event);
        }
      });
    },
    {
      threshold,
      rootMargin: '50px',
    }
  );
};

// Bundle analyzer helper
export const analyzeBundleSize = (stats: { assets?: { name: string; size: number }[] }) => {
  const assets = stats.assets || [];
  const totalSize = assets.reduce((sum: number, asset) => sum + asset.size, 0);
  
  return {
    totalSize,
    assets: assets.map((asset) => ({
      name: asset.name,
      size: asset.size,
      percentage: (asset.size / totalSize) * 100,
    })),
    jsSize: assets
      .filter((asset) => asset.name.endsWith('.js'))
      .reduce((sum: number, asset) => sum + asset.size, 0),
    cssSize: assets
      .filter((asset) => asset.name.endsWith('.css'))
      .reduce((sum: number, asset) => sum + asset.size, 0),
  };
};

// Code splitting utility
export const createDynamicImport = <T>(
  importFn: () => Promise<{ default: T }>,
  options?: {
    loading?: React.ComponentType;
    error?: React.ComponentType<{ error: Error }>;
    ssr?: boolean;
  }
) => {
  const defaultOptions = {
    loading: () => React.createElement('div', null, 'Loading...'),
    error: ({ error }: { error: Error }) => React.createElement('div', null, `Error: ${error.message}`),
    ssr: true,
  };

  const mergedOptions = { ...defaultOptions, ...options };

  return {
    import: importFn,
    ...mergedOptions,
  };
};

// API response optimization
export const optimizeApiResponse = (data: unknown, request: NextRequest) => {
  const acceptEncoding = request.headers.get('accept-encoding') || '';
  const userAgent = request.headers.get('user-agent') || '';
  
  // Check if client supports compression
  const supportsGzip = acceptEncoding.includes('gzip');
  const supportsBrotli = acceptEncoding.includes('br');
  
  // Optimize based on client capabilities
  let optimizedData = data;
  
  // Remove unnecessary fields for mobile clients
  if (userAgent.includes('Mobile')) {
    optimizedData = removeUnnecessaryFields(data, ['fullDescription', 'metadata']);
  }
  
  // Compress large responses
  if (JSON.stringify(data).length > 1000) {
    optimizedData = compressLargeObjects(data);
  }
  
  return {
    data: optimizedData,
    compression: supportsBrotli ? 'br' : supportsGzip ? 'gzip' : 'none',
  };
};

// Remove unnecessary fields
const removeUnnecessaryFields = (obj: unknown, fields: string[]): unknown => {
  if (Array.isArray(obj)) {
    return obj.map(item => removeUnnecessaryFields(item, fields));
  }
  
  if (obj && typeof obj === 'object') {
    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (!fields.includes(key)) {
        filtered[key] = removeUnnecessaryFields(value, fields);
      }
    }
    return filtered;
  }
  
  return obj;
};

// Compress large objects
const compressLargeObjects = (obj: unknown): unknown => {
  if (Array.isArray(obj)) {
    return obj.map(compressLargeObjects);
  }
  
  if (obj && typeof obj === 'object') {
    const compressed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Truncate long strings
      if (typeof value === 'string' && value.length > 500) {
        compressed[key] = value.substring(0, 500) + '...';
      } else {
        compressed[key] = compressLargeObjects(value);
      }
    }
    return compressed;
  }
  
  return obj;
};

// Database query optimization
export const optimizeQuery = (query: { limit: (n: number) => typeof query; offset: (n: number) => typeof query; select: (fields: string) => typeof query; with: (relation: string) => typeof query }, options: {
  limit?: number;
  offset?: number;
  fields?: string[];
  relations?: string[];
}) => {
  let optimizedQuery = query;
  
  // Apply limit and offset for pagination
  if (options.limit) {
    optimizedQuery = optimizedQuery.limit(options.limit);
  }
  
  if (options.offset) {
    optimizedQuery = optimizedQuery.offset(options.offset);
  }
  
  // Select only required fields
  if (options.fields && options.fields.length > 0) {
    optimizedQuery = optimizedQuery.select(options.fields.join(', '));
  }
  
  // Include only necessary relations
  if (options.relations && options.relations.length > 0) {
    options.relations.forEach(relation => {
      optimizedQuery = optimizedQuery.with(relation);
    });
  }
  
  return optimizedQuery;
};

// Memory usage monitoring
export const monitorMemoryUsage = () => {
  if (typeof window === 'undefined') return null;
  
  const memory = (performance as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
  if (!memory) return null;
  
  return {
    usedJSHeapSize: memory.usedJSHeapSize,
    totalJSHeapSize: memory.totalJSHeapSize,
    jsHeapSizeLimit: memory.jsHeapSizeLimit,
    usage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
  };
};

// Request deduplication
const requestCache = new Map<string, Promise<unknown>>();

export const deduplicateRequest = <T>(
  key: string,
  requestFn: () => Promise<T>,
  ttl: number = 5000
): Promise<T> => {
  const cached = requestCache.get(key);
  if (cached) {
    return cached as Promise<T>;
  }
  
  const promise = requestFn();
  requestCache.set(key, promise);
  
  // Clear cache after TTL
  setTimeout(() => {
    requestCache.delete(key);
  }, ttl);
  
  return promise;
};

// Preloading utilities
export const preloadResource = (href: string, as: string) => {
  if (typeof window === 'undefined') return;
  
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = as;
  document.head.appendChild(link);
};

export const preloadRoute = (href: string) => {
  if (typeof window === 'undefined') return;
  
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = href;
  document.head.appendChild(link);
};

// Performance optimization middleware
export const performanceMiddleware = (handler: (request: NextRequest) => Promise<Response>) => {
  return async (request: NextRequest) => {
    const start = Date.now();
    
    try {
      const response = await handler(request);
      const duration = Date.now() - start;
      
      // Add performance headers
      response.headers.set('X-Response-Time', `${duration}ms`);
      response.headers.set('X-Timestamp', new Date().toISOString());
      
      return response;
    } catch (error) {
      const duration = Date.now() - start;
      console.error(`Request failed after ${duration}ms:`, error);
      throw error;
    }
  };
};