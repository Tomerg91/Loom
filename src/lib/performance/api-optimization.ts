/**
 * API optimization utilities for reducing TTFB
 * Implements response caching, compression, and streaming
 */

import { NextRequest, NextResponse } from 'next/server';

import { memoryCache, CacheTTL } from './cache';
import { logger } from '@/lib/logger';

// Response optimization wrapper
export function withApiOptimization(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async function optimizedHandler(req: NextRequest) {
    const start = performance.now();
    
    try {
      // Check if this is a cacheable GET request
      const cacheKey = getCacheKey(req);
      if (req.method === 'GET' && cacheKey) {
        const cached = memoryCache.get(cacheKey);
        if (cached) {
          const response = NextResponse.json(cached);
          addPerformanceHeaders(response, start, true);
          return response;
        }
      }
      
      // Execute the handler
      const response = await handler(req);
      
      // Cache successful responses
      if (req.method === 'GET' && response.ok && cacheKey) {
        try {
          const data = await response.clone().json();
          memoryCache.set(cacheKey, data, getCacheTTL(req));
        } catch {
          // Response is not JSON, skip caching
        }
      }
      
      // Add performance headers
      addPerformanceHeaders(response, start, false);
      
      return response;
    } catch (error) {
      logger.error('API error:', error);
      const response = NextResponse.json(
        { error: 'Internal server error' }, 
        { status: 500 }
      );
      addPerformanceHeaders(response, start, false);
      return response;
    }
  };
}

// Generate cache key for request
function getCacheKey(req: NextRequest): string | null {
  const url = req.nextUrl;
  
  // Skip caching for certain endpoints
  const skipPaths = ['/api/auth/', '/api/admin/'];
  if (skipPaths.some(path => url.pathname.startsWith(path))) {
    return null;
  }
  
  // Include search params in cache key
  const searchParams = url.searchParams.toString();
  return `${url.pathname}${searchParams ? `?${searchParams}` : ''}`;
}

// Get appropriate TTL for different endpoints
function getCacheTTL(req: NextRequest): number {
  const pathname = req.nextUrl.pathname;
  
  if (pathname.includes('/sessions')) return CacheTTL.SHORT;
  if (pathname.includes('/dashboard') || pathname.includes('/stats')) return CacheTTL.DASHBOARD;
  if (pathname.includes('/users') || pathname.includes('/profile')) return CacheTTL.LONG;
  if (pathname.includes('/notifications')) return CacheTTL.SHORT;
  
  return CacheTTL.MEDIUM; // Default
}

// Add performance and cache headers
function addPerformanceHeaders(response: NextResponse, startTime: number, fromCache: boolean) {
  const duration = performance.now() - startTime;
  
  response.headers.set('X-Response-Time', `${duration.toFixed(2)}ms`);
  response.headers.set('X-Cache', fromCache ? 'HIT' : 'MISS');
  
  // Add compression hint
  response.headers.set('Content-Encoding', 'gzip');
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
}

// Streaming response helper for large datasets
export async function createStreamingResponse<T>(
  data: T[], 
  transform: (item: T) => any = (item) => item,
  chunkSize = 100
): Promise<Response> {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode('{"data":['));
    },
    
    async pull(controller) {
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        const transformedChunk = chunk.map(transform);
        
        const chunkStr = transformedChunk
          .map(item => JSON.stringify(item))
          .join(',');
        
        if (i > 0) {
          controller.enqueue(encoder.encode(','));
        }
        
        controller.enqueue(encoder.encode(chunkStr));
        
        // Allow other tasks to run
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      controller.enqueue(encoder.encode(']}'));
      controller.close();
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'application/json',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache'
    }
  });
}

// Batch API requests helper
export class BatchRequestOptimizer {
  private batches = new Map<string, {
    requests: Array<{ resolve: (data: any) => void; reject: (error: any) => void; id: string }>;
    timeout: NodeJS.Timeout;
  }>();
  
  constructor(private batchDelay = 10) {} // 10ms batching window
  
  async batchRequest<T>(
    batchKey: string,
    id: string,
    fetcher: (ids: string[]) => Promise<Map<string, T>>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      let batch = this.batches.get(batchKey);
      
      if (!batch) {
        batch = {
          requests: [],
          timeout: setTimeout(() => this.executeBatch(batchKey, fetcher), this.batchDelay)
        };
        this.batches.set(batchKey, batch);
      }
      
      batch.requests.push({ resolve, reject, id });
    });
  }
  
  private async executeBatch<T>(
    batchKey: string,
    fetcher: (ids: string[]) => Promise<Map<string, T>>
  ) {
    const batch = this.batches.get(batchKey);
    if (!batch) return;
    
    this.batches.delete(batchKey);
    
    try {
      const ids = batch.requests.map(req => req.id);
      const results = await fetcher(ids);
      
      batch.requests.forEach(({ resolve, reject, id }) => {
        const result = results.get(id);
        if (result !== undefined) {
          resolve(result);
        } else {
          reject(new Error(`No result for id: ${id}`));
        }
      });
    } catch (error) {
      batch.requests.forEach(({ reject }) => reject(error));
    }
  }
}

// Global batch optimizer instance
export const batchOptimizer = new BatchRequestOptimizer();

// Database query optimization helper
export async function optimizeQuery<T>(
  query: () => Promise<T>,
  cacheKey?: string,
  ttl = CacheTTL.MEDIUM
): Promise<T> {
  if (cacheKey) {
    const cached = memoryCache.get<T>(cacheKey);
    if (cached) {
      return cached;
    }
  }
  
  const result = await query();
  
  if (cacheKey && result) {
    memoryCache.set(cacheKey, result, ttl);
  }
  
  return result;
}