import { NextRequest } from 'next/server';
import { RATE_LIMITS } from './headers';

// Re-export rate limits for external use
export { RATE_LIMITS };

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  message?: string;
}

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
}

// Storage interface for rate limiting
interface RateLimitStorage {
  get(key: string): Promise<RateLimitEntry | null>;
  set(key: string, value: RateLimitEntry): Promise<void>;
  delete(key: string): Promise<void>;
}

// In-memory implementation for development
class MemoryStorage implements RateLimitStorage {
  private store = new Map<string, RateLimitEntry>();
  
  constructor() {
    // Clean up expired entries every hour
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (now > entry.resetTime) {
          this.store.delete(key);
        }
      }
    }, 60 * 60 * 1000);
  }
  
  async get(key: string): Promise<RateLimitEntry | null> {
    return this.store.get(key) || null;
  }
  
  async set(key: string, value: RateLimitEntry): Promise<void> {
    this.store.set(key, value);
  }
  
  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

// Redis implementation for production
class RedisStorage implements RateLimitStorage {
  private redis: any;
  
  constructor() {
    // Only import Redis in production or when Redis URL is available
    if (process.env.REDIS_URL || process.env.NODE_ENV === 'production') {
      try {
        // Dynamic import to avoid issues in development
        const Redis = require('ioredis');
        this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
      } catch (error) {
        console.warn('Redis not available, falling back to memory storage');
        this.redis = null;
      }
    }
  }
  
  async get(key: string): Promise<RateLimitEntry | null> {
    if (!this.redis) return null;
    
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }
  
  async set(key: string, value: RateLimitEntry): Promise<void> {
    if (!this.redis) return;
    
    try {
      const ttl = Math.ceil((value.resetTime - Date.now()) / 1000);
      await this.redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }
  
  async delete(key: string): Promise<void> {
    if (!this.redis) return;
    
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('Redis delete error:', error);
    }
  }
}

// Create storage instance based on environment
const storage: RateLimitStorage = process.env.REDIS_URL 
  ? new RedisStorage() 
  : new MemoryStorage();

export function getRateLimitKey(request: NextRequest, identifier?: string): string {
  // Use custom identifier or fallback to IP address
  if (identifier) {
    return `rate_limit:${identifier}`;
  }
  
  // Get IP from various headers (for production with proxies)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIP || 'unknown';
  
  return `rate_limit:${ip}:${request.nextUrl.pathname}`;
}

export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Date.now();
  const resetTime = now + config.windowMs;
  
  try {
    const entry = await storage.get(key);
    
    if (!entry || now > entry.resetTime) {
      // First request or window expired
      await storage.set(key, { count: 1, resetTime });
      return {
        allowed: true,
        remaining: config.max - 1,
        resetTime,
      };
    }
    
    if (entry.count >= config.max) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        message: config.message,
      };
    }
    
    // Increment counter
    entry.count++;
    await storage.set(key, entry);
    
    return {
      allowed: true,
      remaining: config.max - entry.count,
      resetTime: entry.resetTime,
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    // On error, allow the request but log the issue
    return {
      allowed: true,
      remaining: config.max - 1,
      resetTime,
    };
  }
}

export async function applyRateLimit(
  request: NextRequest, 
  type: keyof typeof RATE_LIMITS, 
  userId?: string
) {
  const config = RATE_LIMITS[type];
  const key = getRateLimitKey(request, userId);
  const result = await checkRateLimit(key, config);
  
  return {
    ...result,
    headers: {
      'X-RateLimit-Limit': config.max.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
    },
  };
}

// Specific rate limit implementations
export async function rateLimitAuth(request: NextRequest) {
  return await applyRateLimit(request, 'auth');
}

export async function rateLimitAPI(request: NextRequest, userId?: string) {
  return await applyRateLimit(request, 'api', userId);
}

export async function rateLimitBooking(request: NextRequest, userId: string) {
  return await applyRateLimit(request, 'booking', userId);
}

// Advanced rate limiting with different tiers
export interface TieredRateLimit {
  free: { windowMs: number; max: number };
  premium: { windowMs: number; max: number };
  enterprise: { windowMs: number; max: number };
}

export const TIERED_LIMITS: Record<string, TieredRateLimit> = {
  sessions: {
    free: { windowMs: 24 * 60 * 60 * 1000, max: 5 }, // 5 sessions per day
    premium: { windowMs: 24 * 60 * 60 * 1000, max: 50 }, // 50 sessions per day
    enterprise: { windowMs: 24 * 60 * 60 * 1000, max: 1000 }, // 1000 sessions per day
  },
  api: {
    free: { windowMs: 60 * 60 * 1000, max: 100 }, // 100 requests per hour
    premium: { windowMs: 60 * 60 * 1000, max: 1000 }, // 1000 requests per hour
    enterprise: { windowMs: 60 * 60 * 1000, max: 10000 }, // 10000 requests per hour
  },
};

export async function applyTieredRateLimit(
  request: NextRequest,
  resource: keyof typeof TIERED_LIMITS,
  userTier: 'free' | 'premium' | 'enterprise',
  userId: string
) {
  const limits = TIERED_LIMITS[resource];
  const config = limits[userTier];
  
  const key = `tiered_rate_limit:${userId}:${resource}:${userTier}`;
  const result = await checkRateLimit(key, {
    ...config,
    message: `Rate limit exceeded for ${userTier} tier`,
  });
  
  return {
    ...result,
    headers: {
      'X-RateLimit-Limit': config.max.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
      'X-RateLimit-Tier': userTier,
    },
  };
}