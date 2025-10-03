import { NextRequest } from 'next/server';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  message?: string;
  headers: Record<string, string>;
}

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Simple in-memory rate limiter that works with Edge Runtime
class SimpleRateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private lastCleanup = Date.now();
  private readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

  private cleanup() {
    const now = Date.now();
    if (now - this.lastCleanup > this.CLEANUP_INTERVAL) {
      for (const [key, entry] of this.store.entries()) {
        if (now > entry.resetTime) {
          this.store.delete(key);
        }
      }
      this.lastCleanup = now;
    }
  }

  async checkLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    this.cleanup();
    
    const now = Date.now();
    const resetTime = now + config.windowMs;
    
    const entry = this.store.get(key);
    
    if (!entry || now > entry.resetTime) {
      // First request or window expired
      this.store.set(key, { count: 1, resetTime });
      return {
        allowed: true,
        remaining: config.max - 1,
        resetTime,
        headers: {
          'X-RateLimit-Limit': config.max.toString(),
          'X-RateLimit-Remaining': (config.max - 1).toString(),
          'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
        },
      };
    }
    
    if (entry.count >= config.max) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        message: config.message,
        headers: {
          'X-RateLimit-Limit': config.max.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(entry.resetTime / 1000).toString(),
        },
      };
    }
    
    // Increment counter
    entry.count++;
    this.store.set(key, entry);
    
    return {
      allowed: true,
      remaining: config.max - entry.count,
      resetTime: entry.resetTime,
      headers: {
        'X-RateLimit-Limit': config.max.toString(),
        'X-RateLimit-Remaining': (config.max - entry.count).toString(),
        'X-RateLimit-Reset': Math.ceil(entry.resetTime / 1000).toString(),
      },
    };
  }
}

const rateLimiter = new SimpleRateLimiter();

// Rate limit configurations
export const SIMPLE_RATE_LIMITS = {
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: 'Too many authentication attempts, please try again later',
  },
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many API requests, please try again later',
  },
  booking: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // 10 booking attempts per window
    message: 'Too many booking attempts, please try again later',
  },
};

function getRateLimitKey(request: NextRequest, identifier?: string): string {
  if (identifier) {
    return `rate_limit:${identifier}`;
  }
  
  // Get IP from various headers (for production with proxies)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIP || 'unknown';
  
  return `rate_limit:${ip}:${request.nextUrl.pathname}`;
}

export async function rateLimitAuth(request: NextRequest): Promise<RateLimitResult> {
  const key = getRateLimitKey(request);
  return rateLimiter.checkLimit(key, SIMPLE_RATE_LIMITS.auth);
}

export async function rateLimitAPI(request: NextRequest, userId?: string): Promise<RateLimitResult> {
  const key = getRateLimitKey(request, userId);
  return rateLimiter.checkLimit(key, SIMPLE_RATE_LIMITS.api);
}

export async function rateLimitBooking(request: NextRequest, userId: string): Promise<RateLimitResult> {
  const key = getRateLimitKey(request, userId);
  return rateLimiter.checkLimit(key, SIMPLE_RATE_LIMITS.booking);
}
