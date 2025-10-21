import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  createErrorResponse,
  createSuccessResponse,
  HTTP_STATUS,
  rateLimit,
  validateRequestBody,
  withErrorHandling,
  withRequestLogging,
} from '@/lib/api/utils';
import { createAuthService } from '@/lib/auth/auth';
import { createCorsResponse, applyCorsHeaders } from '@/lib/security/cors';
import { basicPasswordSchema } from '@/lib/security/password';
import { createServerClientWithRequest } from '@/lib/supabase/server';

// Enhanced signin schema with security validations
const signInSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .min(5, 'Email must be at least 5 characters')
    .max(254, 'Email must be less than 255 characters')
    .toLowerCase(),
  password: basicPasswordSchema,
  rememberMe: z.boolean().optional().default(false),
});

// Apply stricter rate limiting for signin attempts to prevent brute force
const rateLimitedHandler = rateLimit(10, 60000, { // 10 attempts per minute
  blockDuration: 30 * 60 * 1000, // 30 minutes block for failed attempts
  enableSuspiciousActivityDetection: true,
  skipSuccessfulRequests: true // Only count failed signin attempts
});

// Track failed login attempts per email for additional security
const failedAttempts = new Map<string, { count: number; lastAttempt: number; blockedUntil?: number }>();
const MAX_FAILED_ATTEMPTS = 5;
const BLOCK_DURATION = 15 * 60 * 1000; // 15 minutes

function checkEmailRateLimit(email: string): { blocked: boolean; remainingTime?: number } {
  const now = Date.now();
  const attempts = failedAttempts.get(email);
  
  if (!attempts) {
    return { blocked: false };
  }
  
  // Reset if block period has expired
  if (attempts.blockedUntil && now > attempts.blockedUntil) {
    failedAttempts.delete(email);
    return { blocked: false };
  }
  
  // Check if currently blocked
  if (attempts.blockedUntil && now < attempts.blockedUntil) {
    return { 
      blocked: true, 
      remainingTime: Math.ceil((attempts.blockedUntil - now) / 1000) 
    };
  }
  
  return { blocked: false };
}

function recordFailedAttempt(email: string): void {
  const now = Date.now();
  const attempts = failedAttempts.get(email) || { count: 0, lastAttempt: 0 };
  
  // Reset count if last attempt was more than 1 hour ago
  if (now - attempts.lastAttempt > 60 * 60 * 1000) {
    attempts.count = 0;
  }
  
  attempts.count++;
  attempts.lastAttempt = now;
  
  // Block if too many failed attempts
  if (attempts.count >= MAX_FAILED_ATTEMPTS) {
    attempts.blockedUntil = now + BLOCK_DURATION;
  }
  
  failedAttempts.set(email, attempts);
}

function clearFailedAttempts(email: string): void {
  failedAttempts.delete(email);
}

// Main POST handler with comprehensive security
export const POST = withErrorHandling(
  withRequestLogging(rateLimitedHandler(async (request: NextRequest) => {
    try {
      // Parse and validate request body with security measures
      const body = await request.json();
      const validation = validateRequestBody(signInSchema, body, {
        sanitize: true,
        maxDepth: 3,
        maxSize: 5 * 1024 // 5KB limit for signin
      });

      if (!validation.success) {
        // Log invalid signin attempt for security monitoring
        console.warn('Invalid signin attempt:', {
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent'),
          timestamp: new Date().toISOString(),
          validationErrors: validation.error.details
        });
        
        return createErrorResponse(
          validation.error.message,
          HTTP_STATUS.BAD_REQUEST
        );
      }

      const { email, password, rememberMe } = validation.data;
      
      // Check email-specific rate limiting
      const emailRateLimit = checkEmailRateLimit(email);
      if (emailRateLimit.blocked) {
        console.warn('Email rate limit exceeded:', {
          email,
          remainingTime: emailRateLimit.remainingTime,
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          timestamp: new Date().toISOString()
        });
        
        return createErrorResponse(
          `Too many failed attempts. Please try again in ${Math.ceil((emailRateLimit.remainingTime || 0) / 60)} minutes.`,
          HTTP_STATUS.TOO_MANY_REQUESTS
        );
      }

      // Create a request-scoped Supabase client so session cookies are persisted
      const supabaseResponse = NextResponse.next();
      const supabase = createServerClientWithRequest(request, supabaseResponse);

      // Create auth service and attempt signin
      const authService = createAuthService({
        isServer: true,
        supabaseClient: supabase,
      });
      const { user, error, session } = await authService.signIn({ email, password, rememberMe });

      if (error || !user) {
        // Record failed attempt for this email
        recordFailedAttempt(email);
        
        // Log failed signin for security monitoring
        console.warn('Signin failed:', {
          email,
          error: error || 'User not found',
          timestamp: new Date().toISOString(),
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent')
        });
        
        // Return generic error message to prevent user enumeration
        return createErrorResponse(
          'Invalid email or password',
          HTTP_STATUS.UNAUTHORIZED
        );
      }

      // Check if account is active
      if (user.status !== 'active') {
        console.warn('Inactive account signin attempt:', {
          userId: user.id,
          email: user.email,
          status: user.status,
          timestamp: new Date().toISOString(),
          ip: request.headers.get('x-forwarded-for') || 'unknown'
        });
        
        return createErrorResponse(
          `Account is ${user.status}. Please contact support if you need assistance.`,
          HTTP_STATUS.FORBIDDEN  
        );
      }

      // Clear failed attempts on successful signin
      clearFailedAttempts(email);

      // Check if user has MFA enabled
      const { createMFAService } = await import('@/lib/services/mfa-service');
      const mfaService = createMFAService(true);
      const requiresMFA = await mfaService.requiresMFA(user.id);

      const sanitizedUser = {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        language: user.language,
        status: user.status,
        lastSeenAt: user.lastSeenAt,
        onboardingStatus: user.onboardingStatus,
        onboardingStep: user.onboardingStep,
        onboardingCompletedAt: user.onboardingCompletedAt,
        mfaEnabled: user.mfaEnabled ?? false,
      } as const;

      const sessionPayload = session?.accessToken && session?.refreshToken
        ? {
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
            expiresAt: session.expiresAt ?? null,
          }
        : null;

      const forwardSupabaseCookies = (target: NextResponse) => {
        supabaseResponse.cookies.getAll().forEach(cookie => {
          target.cookies.set({
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path,
            expires: cookie.expires,
            httpOnly: cookie.httpOnly,
            maxAge: cookie.maxAge,
            sameSite: cookie.sameSite,
            secure: cookie.secure,
            priority: cookie.priority,
          });
        });
      };

      if (requiresMFA) {
        // Log MFA required for auditing
        console.info('User signin - MFA required:', {
          userId: user.id,
          email: user.email,
          timestamp: new Date().toISOString(),
          ip: request.headers.get('x-forwarded-for') || 'unknown'
        });

        // Return MFA challenge response (don't complete signin yet)
        const response = createSuccessResponse({
          requiresMFA: true,
          user: { ...sanitizedUser, mfaEnabled: true },
          session: sessionPayload,
          message: 'MFA verification required to complete signin'
        }, 'MFA verification required');

        forwardSupabaseCookies(response);
        return applyCorsHeaders(response, request);
      }

      // Log successful signin for auditing (non-MFA)
      console.info('User signin successful:', {
        userId: user.id,
        email: user.email,
        role: user.role,
        rememberMe,
        mfaEnabled: false,
        timestamp: new Date().toISOString(),
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });

      if (!sessionPayload) {
        console.warn('Sign-in succeeded but no session tokens were returned for user', {
          userId: user.id,
        });
      }

      const response = createSuccessResponse({
        user: sanitizedUser,
        session: sessionPayload,
        message: 'Successfully signed in'
      }, 'Authentication successful');

      forwardSupabaseCookies(response);

      return applyCorsHeaders(response, request);
      
    } catch (error) {
      // Log error for monitoring
      console.error('Signin error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });
      
      return createErrorResponse(
        'An unexpected error occurred during signin',
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }), { name: 'auth:signin' })
);

// Handle CORS preflight requests
export function OPTIONS(request: NextRequest) {
  return createCorsResponse(request);
}
