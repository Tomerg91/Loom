import { NextRequest, NextResponse } from 'next/server';
import { ZodError, ZodSchema } from 'zod';
import type { ApiResponse, ApiError } from './types';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

type UserRole = Database['public']['Tables']['users']['Row']['role'];
type AuthenticatedUser = {
  id: string;
  email: string;
  role: UserRole;
  status: string;
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
  const errorObj = typeof error === 'string' 
    ? createApiError(error)
    : error;

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
  return NextResponse.json(
    createApiResponse(data, message),
    { status }
  );
}

// Request validation
export function validateRequestBody<T>(
  schema: ZodSchema<T>,
  body: unknown
): { success: true; data: T } | { success: false; error: ApiError } {
  try {
    const data = schema.parse(body);
    return { success: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        error: createApiError(
          'Validation failed',
          'VALIDATION_ERROR',
          { issues: error.issues }
        ),
      };
    }
    return {
      success: false,
      error: createApiError('Invalid request body', 'INVALID_BODY'),
    };
  }
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
  const limit = Math.min(100, Math.max(1, parseInt(query.limit as string) || 10));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

export function parseSort(query: Record<string, string | string[]>): {
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
} {
  const sortBy = query.sortBy as string;
  const sortOrder = (query.sortOrder as string)?.toLowerCase() === 'desc' ? 'desc' : 'asc';

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

// Authentication helpers
export function requireAuth<T extends unknown[]>(
  handler: (user: AuthenticatedUser, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      // This will be implemented with Supabase auth
      const authHeader = request.headers.get('authorization');
      if (!authHeader) {
        return createErrorResponse(
          'Authentication required',
          HTTP_STATUS.UNAUTHORIZED
        );
      }

      // Get authenticated user from Supabase
      const supabase = await createClient();
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

      if (authError || !authUser) {
        return createErrorResponse(
          'Invalid authentication token',
          HTTP_STATUS.UNAUTHORIZED
        );
      }

      // Get user profile from database
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('id, email, role, status')
        .eq('id', authUser.id)
        .single();

      if (profileError || !userProfile) {
        return createErrorResponse(
          'User profile not found',
          HTTP_STATUS.UNAUTHORIZED
        );
      }

      // Check if user is active
      if (userProfile.status !== 'active') {
        return createErrorResponse(
          'User account is not active',
          HTTP_STATUS.FORBIDDEN
        );
      }

      const user: AuthenticatedUser = {
        id: userProfile.id,
        email: userProfile.email,
        role: userProfile.role,
        status: userProfile.status
      };
      
      return await handler(user, ...args);
    } catch {
      return createErrorResponse(
        'Authentication failed',
        HTTP_STATUS.UNAUTHORIZED
      );
    }
  };
}

// Role hierarchy for permission checking
const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 3,
  coach: 2,
  client: 1,
};

// Permission helpers
export function requirePermission(requiredRole: UserRole) {
  return function<T extends unknown[]>(
    handler: (user: AuthenticatedUser, ...args: T) => Promise<NextResponse>
  ) {
    return async (user: AuthenticatedUser, ...args: T): Promise<NextResponse> => {
      // Check if user has sufficient role level
      const userLevel = ROLE_HIERARCHY[user.role];
      const requiredLevel = ROLE_HIERARCHY[requiredRole];
      
      if (userLevel < requiredLevel) {
        return createErrorResponse(
          `Access denied. Required role: ${requiredRole}`,
          HTTP_STATUS.FORBIDDEN
        );
      }
      
      return await handler(user, ...args);
    };
  };
}

// Specific role requirement helpers
export function requireAdmin<T extends unknown[]>(
  handler: (user: AuthenticatedUser, ...args: T) => Promise<NextResponse>
) {
  return requirePermission('admin')(handler);
}

export function requireCoach<T extends unknown[]>(
  handler: (user: AuthenticatedUser, ...args: T) => Promise<NextResponse>
) {
  return requirePermission('coach')(handler);
}

export function requireClient<T extends unknown[]>(
  handler: (user: AuthenticatedUser, ...args: T) => Promise<NextResponse>
) {
  return requirePermission('client')(handler);
}

// Rate limiting helpers (basic implementation)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(maxRequests: number = 100, windowMs: number = 60000) {
  return function<T extends unknown[]>(
    handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
  ) {
    return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
      const ip = (request as { ip?: string }).ip || request.headers.get('x-forwarded-for') || 'unknown';
      const now = Date.now();

      // Clean up old entries
      const entries = Array.from(rateLimitMap.entries());
      for (const [key, value] of entries) {
        if (value.resetTime < now) {
          rateLimitMap.delete(key);
        }
      }

      const current = rateLimitMap.get(ip);
      if (!current || current.resetTime < now) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
      } else {
        current.count++;
        if (current.count > maxRequests) {
          return createErrorResponse(
            'Too many requests',
            HTTP_STATUS.TOO_MANY_REQUESTS
          );
        }
      }

      return await handler(request, ...args);
    };
  };
}

// CORS helpers
export function withCors(response: NextResponse): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export function handlePreflight(): NextResponse {
  return withCors(new NextResponse(null, { status: 200 }));
}