import { NextRequest, NextResponse } from 'next/server';
import { ZodError, ZodSchema } from 'zod';

import {
  requirePermission as requirePermissionCheck,
  canAccessResource,
  type Permission,
  type Role,
} from '@/lib/auth/permissions';
import { config } from '@/lib/config';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

import type { ApiResponse, ApiError } from './types';

type UserRole = Database['public']['Tables']['users']['Row']['role'];
export type AuthenticatedUser = {
  id: string;
  email: string;
  role: UserRole;
  status: string;
  metadata?: Record<string, unknown>;
  phone?: string;
  created_at?: string;
  updated_at?: string;
};

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// API response helpers
export function createApiResponse<T>(
  data?: T,
  message?: string
): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

export function createApiError(
  error: string,
  code?: string,
  details?: Record<string, unknown>
): ApiError {
  return {
    code: code || 'UNKNOWN_ERROR',
    message: error,
    details,
  };
}

export function createErrorResponse(
  error: string | ApiError,
  status: number = HTTP_STATUS.BAD_REQUEST
): NextResponse {
  const errorObj = typeof error === 'string' ? createApiError(error) : error;

  return NextResponse.json(
    {
      success: false,
      error: errorObj.message,
      code: errorObj.code,
      details: errorObj.details,
    },
    { status }
  );
}

export function createSuccessResponse<T>(
  data?: T,
  message?: string,
  status: number = HTTP_STATUS.OK
): NextResponse {
  return NextResponse.json(createApiResponse(data, message), { status });
}

// Enhanced request validation with security measures
export function validateRequestBody<T>(
  schema: ZodSchema<T>,
  body: unknown,
  options: {
    sanitize?: boolean;
    maxDepth?: number;
    maxSize?: number;
  } = {}
): { success: true; data: T } | { success: false; error: ApiError } {
  const { sanitize = true, maxDepth = 10, maxSize = 1024 * 1024 } = options;

  try {
    // Check payload size
    const bodyStr = JSON.stringify(body);
    if (bodyStr.length > maxSize) {
      return {
        success: false,
        error: createApiError(
          'Request payload too large',
          'PAYLOAD_TOO_LARGE',
          { maxSize, actualSize: bodyStr.length }
        ),
      };
    }

    // Check object depth to prevent DoS attacks
    if (checkObjectDepth(body, maxDepth) > maxDepth) {
      return {
        success: false,
        error: createApiError(
          'Request payload too deeply nested',
          'PAYLOAD_TOO_DEEP',
          { maxDepth }
        ),
      };
    }

    // Sanitize input if requested
    let sanitizedBody = body;
    if (sanitize && typeof body === 'object' && body !== null) {
      sanitizedBody = sanitizeObject(body);
    }

    const data = schema.parse(sanitizedBody);
    return { success: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      // Log validation failures for security monitoring
      console.warn('Request validation failed:', {
        issues: error.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        })),
        timestamp: new Date().toISOString(),
      });

      return {
        success: false,
        error: createApiError('Validation failed', 'VALIDATION_ERROR', {
          issues: error.issues,
        }),
      };
    }
    return {
      success: false,
      error: createApiError('Invalid request body', 'INVALID_BODY'),
    };
  }
}

// Helper function to check object depth
function checkObjectDepth(
  obj: unknown,
  maxDepth: number,
  currentDepth = 0
): number {
  if (currentDepth > maxDepth) return currentDepth;
  if (typeof obj !== 'object' || obj === null) return currentDepth;

  let maxChildDepth = currentDepth;
  for (const value of Object.values(obj)) {
    const childDepth = checkObjectDepth(value, maxDepth, currentDepth + 1);
    maxChildDepth = Math.max(maxChildDepth, childDepth);
  }

  return maxChildDepth;
}

// Helper function to sanitize object properties
function sanitizeObject(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeValue(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    // Sanitize property names to prevent prototype pollution
    const sanitizedKey = sanitizePropertyName(key);
    if (sanitizedKey) {
      sanitized[sanitizedKey] = sanitizeObject(value);
    }
  }

  return sanitized;
}

// Helper function to sanitize individual values
function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    // Remove potential XSS vectors and normalize whitespace
    return value
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim()
      .substring(0, 10000); // Limit string length
  }

  return value;
}

// Helper function to sanitize property names
function sanitizePropertyName(key: string): string | null {
  // Prevent prototype pollution
  const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
  if (dangerousKeys.includes(key.toLowerCase())) {
    return null;
  }

  // Only allow alphanumeric characters, underscores, and hyphens
  if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
    return null;
  }

  return key.substring(0, 100); // Limit key length
}

// Query parameter helpers
export function parseQueryParams(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const params: Record<string, string | string[]> = {};

  searchParams.forEach((value, key) => {
    if (params[key]) {
      // Convert to array if multiple values
      if (Array.isArray(params[key])) {
        (params[key] as string[]).push(value);
      } else {
        params[key] = [params[key] as string, value];
      }
    } else {
      params[key] = value;
    }
  });

  return params;
}

export function parsePagination(query: Record<string, string | string[]>): {
  page: number;
  limit: number;
  offset: number;
} {
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const limit = Math.min(
    config.api.MAX_PAGE_SIZE,
    Math.max(
      config.api.MIN_PAGE_SIZE,
      parseInt(query.limit as string) || config.api.DEFAULT_PAGE_SIZE
    )
  );
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

export function parseSort(query: Record<string, string | string[]>): {
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
} {
  const sortBy = query.sortBy as string;
  const sortOrder =
    (query.sortOrder as string)?.toLowerCase() === 'desc' ? 'desc' : 'asc';

  return { sortBy, sortOrder };
}

// Error handling middleware
export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error('API Error:', error);

      if (error instanceof Error) {
        return createErrorResponse(
          error.message,
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
      }

      return createErrorResponse(
        'An unexpected error occurred',
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  };
}

// Request logging wrapper with correlation ID
export function withRequestLogging(
  handler: (request: NextRequest, ...args: unknown[]) => Promise<NextResponse>,
  opts: { name?: string } = {}
) {
  return async (
    request: NextRequest,
    ...rest: unknown[]
  ): Promise<NextResponse> => {
    const enabled = process.env.LOG_REQUESTS === 'true';
    const id =
      (request.headers.get('x-request-id') as string) ||
      crypto.randomUUID?.() ||
      Math.random().toString(36).slice(2);
    const start = Date.now();
    if (enabled) {
      console.info('[API REQ]', {
        id,
        name: opts.name || 'handler',
        method: request.method,
        url: request.nextUrl.pathname + (request.nextUrl.search || ''),
        ip:
          request.headers.get('x-forwarded-for') ||
          request.headers.get('x-real-ip') ||
          'unknown',
        ua: request.headers.get('user-agent') || '',
      });
    }
    try {
      const res = await handler(request, ...rest);
      if (enabled) {
        res.headers.set('X-Request-ID', id);
        console.info('[API RES]', {
          id,
          name: opts.name || 'handler',
          status: res.status,
          durMs: Date.now() - start,
        });
      }
      return res;
    } catch (err) {
      if (enabled) {
        console.error('[API ERR]', {
          id,
          name: opts.name || 'handler',
          error: err instanceof Error ? err.message : String(err),
          durMs: Date.now() - start,
        });
      }
      throw err;
    }
  };
}

// Authentication helpers
export function requireAuth<T extends unknown[]>(
  handler: (
    user: AuthenticatedUser,
    request: NextRequest,
    ...args: T
  ) => Promise<NextResponse>
) {
  return async (
    request: NextRequest,
    ...args: T
  ): Promise<NextResponse> => {
    try {
      const supabase = await createClient();
      const authHeader = request.headers.get('authorization');

      type SupabaseUser = {
        id: string;
        email: string;
        role?: string;
        exp?: number;
        phone?: string | null;
        user_metadata?: Record<string, unknown> | null;
      } | null;

      let authUser: SupabaseUser = null;
      let sessionExpiresAt: number | null = null;

      if (authHeader) {
        if (!authHeader.startsWith('Bearer ')) {
          return createErrorResponse(
            'Invalid authentication header format',
            HTTP_STATUS.UNAUTHORIZED
          );
        }

        const token = authHeader.split(' ')[1];
        if (!token || token.length < 10) {
          return createErrorResponse(
            'Invalid authentication token format',
            HTTP_STATUS.UNAUTHORIZED
          );
        }

        const { data, error } = await supabase.auth.getUser(token);

        if (error) {
          console.warn('Authentication failed:', {
            error: error.message,
            timestamp: new Date().toISOString(),
            ip: request.headers.get('x-forwarded-for') || 'unknown',
          });

          return createErrorResponse(
            'Invalid or expired authentication token',
            HTTP_STATUS.UNAUTHORIZED
          );
        }

        authUser = data.user as SupabaseUser;
        sessionExpiresAt = authUser?.exp ? authUser.exp * 1000 : null;
      } else {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) {
          console.warn('Session lookup failed:', {
            error: sessionError.message,
            timestamp: new Date().toISOString(),
            ip: request.headers.get('x-forwarded-for') || 'unknown',
          });

          return createErrorResponse(
            'Authentication required. Please sign in again.',
            HTTP_STATUS.UNAUTHORIZED
          );
        }

        if (!sessionData.session) {
          return createErrorResponse(
            'Authentication required. Please sign in again.',
            HTTP_STATUS.UNAUTHORIZED
          );
        }

        authUser = sessionData.session.user as SupabaseUser;
        sessionExpiresAt = sessionData.session.expires_at
          ? new Date(sessionData.session.expires_at).getTime()
          : null;
      }

      if (!authUser || !authUser.id || !authUser.email) {
        return createErrorResponse(
          'Authentication token does not contain valid user data',
          HTTP_STATUS.UNAUTHORIZED
        );
      }

      if (sessionExpiresAt && sessionExpiresAt < Date.now()) {
        return createErrorResponse(
          'Authentication token has expired',
          HTTP_STATUS.UNAUTHORIZED
        );
      }

      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('id, email, role, status, created_at, updated_at')
        .eq('id', authUser.id)
        .eq('email', authUser.email)
        .single();

      if (profileError) {
        console.warn('User profile lookup failed:', {
          userId: authUser.id,
          error: profileError.message,
          timestamp: new Date().toISOString(),
        });

        return createErrorResponse(
          'User profile not found or access denied',
          HTTP_STATUS.UNAUTHORIZED
        );
      }

      if (!userProfile) {
        return createErrorResponse(
          'User profile does not exist',
          HTTP_STATUS.UNAUTHORIZED
        );
      }

      if (!userProfile.status || userProfile.status !== 'active') {
        return createErrorResponse(
          `User account is ${userProfile.status || 'inactive'}. Please contact support.`,
          HTTP_STATUS.FORBIDDEN
        );
      }

      const validRoles: UserRole[] = ['admin', 'coach', 'client'];
      if (!userProfile.role || !validRoles.includes(userProfile.role)) {
        return createErrorResponse(
          'User account has invalid role configuration',
          HTTP_STATUS.FORBIDDEN
        );
      }

      const createdAt =
        (userProfile as { createdAt?: string }).createdAt ||
        userProfile.created_at;
      const accountAge = createdAt
        ? Date.now() - new Date(createdAt).getTime()
        : 0;
      if (accountAge < 0) {
        return createErrorResponse(
          'Invalid account creation date detected',
          HTTP_STATUS.FORBIDDEN
        );
      }

      const user: AuthenticatedUser = {
        id: userProfile.id,
        email: userProfile.email,
        role: userProfile.role,
        status: userProfile.status,
        metadata: authUser.user_metadata ?? undefined,
        phone: authUser.phone ?? undefined,
        created_at: userProfile.created_at ?? undefined,
        updated_at: userProfile.updated_at ?? undefined,
      };

      await supabase
        .from('users')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', userProfile.id);

      return handler(user, request, ...args);
    } catch (error) {
      console.error('Authentication error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });

      return createErrorResponse(
        'Authentication failed due to server error',
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  };
}

// Role hierarchy for permission checking
const ROLE_HIERARCHY: Record<'admin' | 'coach' | 'client', number> = {
  admin: 3,
  coach: 2,
  client: 1,
};

/**
 * Generic factory for creating security middleware functions
 * Eliminates repetitive patterns in permission and access control
 */
function createSecurityMiddleware<T extends unknown[]>(
  checkFunction: (
    user: AuthenticatedUser,
    ...args: T
  ) => boolean | Promise<boolean>,
  errorMessage: (user: AuthenticatedUser, ...args: T) => string,
  logContext: (
    user: AuthenticatedUser,
    ...args: T
  ) => Record<string, unknown>
) {
  return function (
    handler: (
      user: AuthenticatedUser,
      ...args: T
    ) => Promise<Response | NextResponse>
  ) {
    return async (
      user: AuthenticatedUser,
      ...args: T
    ): Promise<Response | NextResponse> => {
      try {
        const hasAccess = await checkFunction(user, ...args);

        if (!hasAccess) {
          const context = {
            userId: user.id,
            role: user.role,
            timestamp: new Date().toISOString(),
            ...logContext(user, ...args),
          };

          console.warn('Access denied:', context);

          return createErrorResponse(
            errorMessage(user, ...args),
            HTTP_STATUS.FORBIDDEN
          );
        }

        // Log successful access for auditing
        console.debug('Access granted:', {
          userId: user.id,
          role: user.role,
          timestamp: new Date().toISOString(),
          ...logContext(user, ...args),
        });

        return await handler(user, ...args);
      } catch (error) {
        console.warn('Security check failed:', {
          userId: user.id,
          role: user.role,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          ...logContext(user, ...args),
        });

        return createErrorResponse(
          errorMessage(user, ...args),
          HTTP_STATUS.FORBIDDEN
        );
      }
    };
  };
}

// Enhanced permission helpers using the generic factory
export function requirePermission<T extends unknown[]>(requiredPermission: Permission) {
  return createSecurityMiddleware<T>(
    (user: AuthenticatedUser, ..._args: T) => {
      requirePermissionCheck(user.role as Role, requiredPermission);
      return true;
    },
    () => `Access denied. Required permission: ${requiredPermission}`,
    () => ({ permission: requiredPermission })
  );
}

// Resource-based permission checking using the factory
export function requireResourceAccess<T extends unknown[]>(resource: string, action: string) {
  return createSecurityMiddleware<T>(
    (user: AuthenticatedUser, ..._args: T) =>
      canAccessResource(user.role as Role, resource, action),
    () => `Access denied. Cannot ${action} ${resource}`,
    () => ({ resource, action })
  );
}

// Legacy role-based permission checking using the factory
export function requireRole<T extends unknown[]>(requiredRole: UserRole) {
  return createSecurityMiddleware<T>(
    (user: AuthenticatedUser, ..._args: T) => {
      const userLevel =
        ROLE_HIERARCHY[user.role as 'admin' | 'coach' | 'client'] ?? 0;
      const requiredLevel =
        ROLE_HIERARCHY[requiredRole as 'admin' | 'coach' | 'client'] ??
        Infinity;
      return userLevel >= requiredLevel;
    },
    () => `Access denied. Required role: ${requiredRole}`,
    user => ({ userRole: user.role, requiredRole })
  );
}

// Specific role requirement helpers (updated to use new permission system)
export function requireAdmin<T extends unknown[]>(
  handler: (
    user: AuthenticatedUser,
    ...args: T
  ) => Promise<NextResponse | Response>
) {
  return requirePermission<T>('admin:read')(handler);
}

export function requireCoach<T extends unknown[]>(
  handler: (
    user: AuthenticatedUser,
    ...args: T
  ) => Promise<NextResponse | Response>
) {
  return requirePermission<T>('coach:read')(handler);
}

export function requireClient<T extends unknown[]>(
  handler: (
    user: AuthenticatedUser,
    ...args: T
  ) => Promise<NextResponse | Response>
) {
  return requirePermission<T>('client:read')(handler);
}

// Ownership-based access control
export function requireOwnership<T extends unknown[]>(
  handler: (
    user: AuthenticatedUser,
    ...args: T
  ) => Promise<NextResponse | Response>,
  getOwnerId: (
    user: AuthenticatedUser,
    ...args: T
  ) => Promise<string | null>
) {
  return async (
    user: AuthenticatedUser,
    ...args: T
  ): Promise<NextResponse | Response> => {
    try {
      const ownerId = await getOwnerId(user, ...args);

      // Allow access if user is the owner or has admin role
      if (user.id === ownerId || user.role === 'admin') {
        return await handler(user, ...args);
      }

      // For coaches, allow access to their clients' resources
      if (user.role === 'coach' && ownerId) {
        const supabase = await createClient();
        const { data: hasAccess } = await supabase
          .from('sessions')
          .select('id')
          .eq('coach_id', user.id)
          .eq('client_id', ownerId)
          .limit(1);

        if (hasAccess && hasAccess.length > 0) {
          return await handler(user, ...args);
        }
      }

      console.warn('Ownership access denied:', {
        userId: user.id,
        role: user.role,
        ownerId,
        timestamp: new Date().toISOString(),
      });

      return createErrorResponse(
        'Access denied. You can only access your own resources.',
        HTTP_STATUS.FORBIDDEN
      );
    } catch (error) {
      console.error('Ownership check failed:', {
        userId: user.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });

      return createErrorResponse(
        'Access denied due to ownership verification failure',
        HTTP_STATUS.FORBIDDEN
      );
    }
  };
}

// Enhanced rate limiting with security features
const rateLimitMap = new Map<
  string,
  { count: number; resetTime: number; suspiciousActivity: boolean }
>();
const blockedIPs = new Set<string>();
const MAX_MAP_SIZE = 10000; // Prevent memory exhaustion

export function rateLimit(
  maxRequests: number = 100,
  windowMs: number = 60000,
  options: {
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
    blockDuration?: number;
    enableSuspiciousActivityDetection?: boolean;
  } = {}
) {
  const {
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    blockDuration = 15 * 60 * 1000, // 15 minutes
    enableSuspiciousActivityDetection = true,
  } = options;

  return function <T extends unknown[]>(
    handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
  ) {
    return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
      const ip = getClientIP(request);
      const now = Date.now();
      const key = `${ip}:${request.nextUrl.pathname}`;

      // Check if IP is blocked
      if (blockedIPs.has(ip)) {
        console.warn('Blocked IP attempted access:', {
          ip,
          path: request.nextUrl.pathname,
          userAgent: request.headers.get('user-agent'),
          timestamp: new Date().toISOString(),
        });

        return createErrorResponse(
          'Access temporarily blocked due to suspicious activity',
          HTTP_STATUS.TOO_MANY_REQUESTS
        );
      }

      // Clean up old entries and prevent memory exhaustion
      if (rateLimitMap.size > MAX_MAP_SIZE) {
        const entries = Array.from(rateLimitMap.entries());
        const expiredKeys = entries
          .filter(([, value]) => value.resetTime < now)
          .map(([key]) => key);

        expiredKeys.forEach(key => rateLimitMap.delete(key));

        // If still too large, remove oldest entries
        if (rateLimitMap.size > MAX_MAP_SIZE * 0.8) {
          const oldestKeys = entries
            .sort(([, a], [, b]) => a.resetTime - b.resetTime)
            .slice(0, Math.floor(MAX_MAP_SIZE * 0.2))
            .map(([key]) => key);

          oldestKeys.forEach(key => rateLimitMap.delete(key));
        }
      }

      const current = rateLimitMap.get(key);
      if (!current || current.resetTime < now) {
        rateLimitMap.set(key, {
          count: 1,
          resetTime: now + windowMs,
          suspiciousActivity: false,
        });
      } else {
        current.count++;

        // Detect suspicious activity patterns
        if (enableSuspiciousActivityDetection) {
          const requestRate =
            current.count / ((now - (current.resetTime - windowMs)) / 1000);
          if (requestRate > (maxRequests / (windowMs / 1000)) * 2) {
            current.suspiciousActivity = true;
          }
        }

        if (current.count > maxRequests) {
          // Log rate limit violation
          console.warn('Rate limit exceeded:', {
            ip,
            path: request.nextUrl.pathname,
            count: current.count,
            maxRequests,
            windowMs,
            suspiciousActivity: current.suspiciousActivity,
            userAgent: request.headers.get('user-agent'),
            timestamp: new Date().toISOString(),
          });

          // Block IP if showing suspicious activity
          if (current.suspiciousActivity && current.count > maxRequests * 2) {
            blockedIPs.add(ip);
            setTimeout(() => blockedIPs.delete(ip), blockDuration);

            console.error('IP blocked due to excessive requests:', {
              ip,
              blockDuration: blockDuration / 1000 / 60,
              timestamp: new Date().toISOString(),
            });
          }

          const response = createErrorResponse(
            'Too many requests. Please try again later.',
            HTTP_STATUS.TOO_MANY_REQUESTS
          );

          // Add rate limit headers
          response.headers.set('X-RateLimit-Limit', maxRequests.toString());
          response.headers.set('X-RateLimit-Remaining', '0');
          response.headers.set(
            'X-RateLimit-Reset',
            Math.ceil(current.resetTime / 1000).toString()
          );
          response.headers.set(
            'Retry-After',
            Math.ceil((current.resetTime - now) / 1000).toString()
          );

          return response;
        }
      }

      // Execute the handler
      const response = await handler(request, ...args);

      // Update rate limit based on response status
      const responseStatus = response.status;
      const currentEntry = rateLimitMap.get(key);

      if (currentEntry) {
        // Don't count successful requests if configured
        if (skipSuccessfulRequests && responseStatus < 400) {
          currentEntry.count = Math.max(0, currentEntry.count - 1);
        }

        // Don't count failed requests if configured
        if (skipFailedRequests && responseStatus >= 400) {
          currentEntry.count = Math.max(0, currentEntry.count - 1);
        }

        // Add rate limit headers to successful responses
        if (responseStatus < 400) {
          response.headers.set('X-RateLimit-Limit', maxRequests.toString());
          response.headers.set(
            'X-RateLimit-Remaining',
            Math.max(0, maxRequests - currentEntry.count).toString()
          );
          response.headers.set(
            'X-RateLimit-Reset',
            Math.ceil(currentEntry.resetTime / 1000).toString()
          );
        }
      }

      return response;
    };
  };
}

// Helper function to get client IP with multiple fallbacks
function getClientIP(request: NextRequest): string {
  // Try various headers for IP address
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip',
    'cf-connecting-ip', // Cloudflare
    'x-forwarded',
    'forwarded-for',
    'forwarded',
  ];

  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      // X-Forwarded-For can contain multiple IPs, take the first one
      const ip = value.split(',')[0].trim();
      if (isValidIP(ip)) {
        return ip;
      }
    }
  }

  // Fallback to connection IP or unknown
  const requestWithIp = request as NextRequest & { ip?: string | undefined };
  return requestWithIp.ip ?? 'unknown';
}

// Helper function to validate IP address format
function isValidIP(ip: string): boolean {
  // Basic IPv4 and IPv6 validation
  const ipv4Regex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

// CORS helpers with environment-aware origin validation
function getAllowedOrigins(): string[] {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const customOrigins =
    process.env.ALLOWED_ORIGINS?.split(',').map(origin => origin.trim()) || [];

  if (isDevelopment) {
    // Allow localhost in development
    return [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      ...customOrigins,
    ];
  }

  // Production origins
  const productionOrigins = [
    'https://loom-app.vercel.app',
    'https://www.loom-app.com',
    ...customOrigins,
  ];

  return productionOrigins.filter(Boolean);
}

export function withCors(
  response: NextResponse,
  origin?: string
): NextResponse {
  const allowedOrigins = getAllowedOrigins();

  // Validate origin against allowed list
  let allowedOrigin = '';
  if (origin && allowedOrigins.includes(origin)) {
    allowedOrigin = origin;
  } else if (allowedOrigins.length > 0) {
    // Use first allowed origin as default (usually main domain)
    allowedOrigin = allowedOrigins[0];
  }

  if (allowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
  }

  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  );
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With'
  );
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours

  return response;
}

export function handlePreflight(request?: NextRequest): NextResponse {
  const origin = request?.headers.get('origin') || '';
  return withCors(new NextResponse(null, { status: 200 }), origin);
}
