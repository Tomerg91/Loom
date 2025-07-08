import { NextRequest } from 'next/server';
import { RATE_LIMITS } from './headers';

// Re-export rate limits for external use
export { RATE_LIMITS };

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 60 * 1000);

export function getRateLimitKey(request: NextRequest, identifier?: string): string {
  // Use custom identifier or fallback to IP address
  if (identifier) {
    return identifier;
  }
  
  // Get IP from various headers (for production with proxies)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIP || 'unknown';
  
  return `${ip}:${request.nextUrl.pathname}`;
}

export function checkRateLimit(
  key: string,
  config: { windowMs: number; max: number; message: string }
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  message?: string;
} {
  const now = Date.now();
  const resetTime = now + config.windowMs;
  
  const entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetTime) {
    // First request or window expired
    rateLimitStore.set(key, { count: 1, resetTime });
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
  rateLimitStore.set(key, entry);
  
  return {
    allowed: true,
    remaining: config.max - entry.count,
    resetTime: entry.resetTime,
  };
}

export function applyRateLimit(request: NextRequest, type: keyof typeof RATE_LIMITS, userId?: string) {
  const config = RATE_LIMITS[type];
  const key = getRateLimitKey(request, userId);
  const result = checkRateLimit(key, config);
  
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
export function rateLimitAuth(request: NextRequest) {
  return applyRateLimit(request, 'auth');
}

export function rateLimitAPI(request: NextRequest, userId?: string) {
  return applyRateLimit(request, 'api', userId);
}

export function rateLimitBooking(request: NextRequest, userId: string) {
  return applyRateLimit(request, 'booking', userId);
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

export function applyTieredRateLimit(
  request: NextRequest,
  resource: keyof typeof TIERED_LIMITS,
  userTier: 'free' | 'premium' | 'enterprise',
  userId: string
) {
  const limits = TIERED_LIMITS[resource];
  const config = limits[userTier];
  
  const key = `${userId}:${resource}:${userTier}`;
  const result = checkRateLimit(key, {
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