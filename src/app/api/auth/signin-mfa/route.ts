/**
 * MFA Signin Completion API Endpoint
 * POST /api/auth/signin-mfa
 * 
 * Completes the signin process after MFA verification.
 * This endpoint is called after initial username/password authentication
 * when the user needs to provide MFA verification.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createAuthService,
  DEFAULT_SESSION_MAX_AGE,
  REMEMBER_ME_SESSION_MAX_AGE,
} from '@/lib/auth/auth';
import { createMfaService, getClientIP, getUserAgent } from '@/lib/services/mfa-service';
import { createCorsResponse, applyCorsHeaders } from '@/lib/security/cors';
import {
  createSuccessResponse,
  createErrorResponse,
  withErrorHandling,
  validateRequestBody,
  rateLimit,
  HTTP_STATUS
} from '@/lib/api/utils';
import { z } from 'zod';
import { createServerClientWithRequest } from '@/lib/supabase/server';

const SESSION_COOKIE_NAMES = new Set(['sb-access-token', 'sb-refresh-token']);

function applySessionCookies(
  destination: NextResponse,
  source: NextResponse,
  rememberMe: boolean
) {
  const lifetimeSeconds = rememberMe
    ? REMEMBER_ME_SESSION_MAX_AGE
    : DEFAULT_SESSION_MAX_AGE;
  const expiresAt = new Date(Date.now() + lifetimeSeconds * 1000);

  source.cookies.getAll().forEach(cookie => {
    const isSessionCookie = SESSION_COOKIE_NAMES.has(cookie.name);
    destination.cookies.set({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      expires: isSessionCookie ? expiresAt : cookie.expires,
      httpOnly: cookie.httpOnly,
      maxAge: isSessionCookie ? lifetimeSeconds : cookie.maxAge,
      sameSite: cookie.sameSite,
      secure: cookie.secure,
      priority: cookie.priority,
    });
  });
}

// MFA signin completion schema
const mfaSignInSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  code: z.string()
    .min(6, 'Code must be at least 6 characters')
    .max(8, 'Code must be at most 8 characters')
    .regex(/^[A-Z0-9]+$/, 'Code must contain only uppercase letters and numbers'),
  method: z.enum(['totp', 'backup_code']).default('totp'),
  rememberMe: z.boolean().optional().default(false),
});

// Apply rate limiting for MFA signin attempts
const rateLimitedHandler = rateLimit(15, 60000, { // 15 attempts per minute
  blockDuration: 15 * 60 * 1000, // 15 minutes block for failed MFA attempts
  enableSuspiciousActivityDetection: true,
  skipSuccessfulRequests: true
});

// Track failed MFA attempts (in addition to the service-level tracking)
const failedMFAAttempts = new Map<string, { count: number; lastAttempt: number; blockedUntil?: number }>();
const MAX_FAILED_MFA_ATTEMPTS = 10;
const MFA_BLOCK_DURATION = 30 * 60 * 1000; // 30 minutes

function checkMFARateLimit(userId: string): { blocked: boolean; remainingTime?: number } {
  const now = Date.now();
  const attempts = failedMFAAttempts.get(userId);
  
  if (!attempts) {
    return { blocked: false };
  }
  
  // Reset if block period has expired
  if (attempts.blockedUntil && now > attempts.blockedUntil) {
    failedMFAAttempts.delete(userId);
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

function recordFailedMFAAttempt(userId: string): void {
  const now = Date.now();
  const attempts = failedMFAAttempts.get(userId) || { count: 0, lastAttempt: 0 };
  
  // Reset count if last attempt was more than 2 hours ago
  if (now - attempts.lastAttempt > 2 * 60 * 60 * 1000) {
    attempts.count = 0;
  }
  
  attempts.count++;
  attempts.lastAttempt = now;
  
  // Block if too many failed attempts
  if (attempts.count >= MAX_FAILED_MFA_ATTEMPTS) {
    attempts.blockedUntil = now + MFA_BLOCK_DURATION;
  }
  
  failedMFAAttempts.set(userId, attempts);
}

function clearFailedMFAAttempts(userId: string): void {
  failedMFAAttempts.delete(userId);
}

// Main POST handler for MFA signin completion
export const POST = withErrorHandling(
  rateLimitedHandler(async (request: NextRequest) => {
    try {
      // Parse and validate request body
      const body = await request.json();
      const validation = validateRequestBody(mfaSignInSchema, body, {
        sanitize: true,
        maxDepth: 3,
        maxSize: 5 * 1024 // 5KB limit
      });

      if (!validation.success) {
        console.warn('Invalid MFA signin attempt:', {
          ip: getClientIP(request) || 'unknown',
          userAgent: getUserAgent(request),
          timestamp: new Date().toISOString(),
          validationErrors: validation.error.details
        });
        
        return createErrorResponse(
          validation.error.message,
          HTTP_STATUS.BAD_REQUEST
        );
      }

      const { userId, code, method = 'totp' } = validation.data;
      const rememberMe = validation.data.rememberMe ?? false;

      const supabaseResponse = NextResponse.next();
      const supabaseClient = createServerClientWithRequest(
        request,
        supabaseResponse
      );
      const authService = createAuthService({
        isServer: true,
        supabaseClient,
      });

      // Check additional MFA rate limiting
      const mfaRateLimit = checkMFARateLimit(userId);
      if (mfaRateLimit.blocked) {
        console.warn('MFA rate limit exceeded:', {
          userId,
          remainingTime: mfaRateLimit.remainingTime,
          ip: getClientIP(request) || 'unknown',
          timestamp: new Date().toISOString()
        });
        
        return createErrorResponse(
          `Too many failed MFA attempts. Please try again in ${Math.ceil((mfaRateLimit.remainingTime || 0) / 60)} minutes.`,
          HTTP_STATUS.TOO_MANY_REQUESTS
        );
      }

      // Extract client information for audit logging
      const ipAddress = getClientIP(request);
      const userAgent = getUserAgent(request);

      // Verify MFA code
      const mfaService = createMfaService(true);
      const verificationResult = await mfaService.verifyMFA(
        userId,
        code.toUpperCase(),
        method,
        ipAddress,
        userAgent
      );

      if (!verificationResult.success) {
        // Record failed MFA attempt
        recordFailedMFAAttempt(userId);
        
        console.warn('MFA verification failed:', {
          userId,
          method,
          error: verificationResult.error,
          timestamp: new Date().toISOString(),
          ip: ipAddress || 'unknown',
          userAgent: userAgent
        });
        
        // Return appropriate error based on failure type
        let status: number = HTTP_STATUS.UNAUTHORIZED;
        if (verificationResult.error?.includes('Too many attempts')) {
          status = HTTP_STATUS.TOO_MANY_REQUESTS;
        }
        
        return createErrorResponse(
          verificationResult.error || 'MFA verification failed',
          status
        );
      }

      // MFA verification successful - clear failed attempts
      clearFailedMFAAttempts(userId);

      // Get user data to complete signin
      const user = await authService.getCurrentUser();

      if (!user || user.id !== userId) {
        console.error('User mismatch after MFA verification:', {
          expectedUserId: userId,
          actualUser: user?.id || 'null',
          timestamp: new Date().toISOString()
        });
        
        return createErrorResponse(
          'Authentication error occurred',
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
      }

      // Verify user is still active
      if (user.status !== 'active') {
        console.warn('Inactive account completing MFA signin:', {
          userId: user.id,
          status: user.status,
          timestamp: new Date().toISOString(),
          ip: ipAddress || 'unknown'
        });
        
        return createErrorResponse(
          `Account is ${user.status}. Please contact support if you need assistance.`,
          HTTP_STATUS.FORBIDDEN
        );
      }

      // Get MFA status for additional info
      const mfaStatus = await mfaService.getMFAStatus(userId);

      // Log successful MFA signin completion
      console.info('MFA signin completed successfully:', {
        userId: user.id,
        email: user.email,
        role: user.role,
        method,
        rememberMe,
        backupCodesRemaining: mfaStatus.backupCodesRemaining,
        timestamp: new Date().toISOString(),
        ip: ipAddress || 'unknown'
      });

      // Prepare response with warnings if needed
      let warnings: string[] = [];
      if (method === 'backup_code' && mfaStatus.backupCodesRemaining === 0) {
        warnings.push('This was your last backup code. Generate new backup codes immediately.');
      } else if (method === 'backup_code' && mfaStatus.backupCodesRemaining <= 2) {
        warnings.push(`You have only ${mfaStatus.backupCodesRemaining} backup codes remaining. Consider generating new ones.`);
      }

      // Return complete user data (signin successful)
      const lifetimeSeconds = rememberMe
        ? REMEMBER_ME_SESSION_MAX_AGE
        : DEFAULT_SESSION_MAX_AGE;

      const { data: currentSession, error: sessionError } =
        await supabaseClient.auth.getSession();

      if (sessionError) {
        console.warn('Failed to load Supabase session during MFA completion:', {
          error: sessionError.message,
        });
      }

      const session = currentSession?.session;

      if (session?.access_token && session?.refresh_token) {
        const { error: setSessionError } = await supabaseClient.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });

        if (setSessionError) {
          console.warn('Failed to extend Supabase session during MFA completion:', {
            error: setSessionError.message,
          });
        }
      }

      const response = createSuccessResponse({
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          avatarUrl: user.avatarUrl,
          language: user.language,
          status: user.status,
          lastSeenAt: user.lastSeenAt,
          mfaEnabled: true
        },
        mfa: {
          method,
          backupCodesRemaining: mfaStatus.backupCodesRemaining,
          warnings
        },
        message: 'Successfully signed in with MFA'
      }, 'MFA authentication successful');

      applySessionCookies(response, supabaseResponse, rememberMe);

      return applyCorsHeaders(response, request);

    } catch (error) {
      console.error('MFA signin completion error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        ip: getClientIP(request) || 'unknown'
      });
      
      return createErrorResponse(
        'An unexpected error occurred during MFA signin',
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  })
);

// Handle CORS preflight requests
export function OPTIONS(request: NextRequest) {
  return createCorsResponse(request);
}

// Prevent other HTTP methods
export async function GET() {
  return createErrorResponse('Method not allowed', HTTP_STATUS.METHOD_NOT_ALLOWED);
}

export async function PUT() {
  return createErrorResponse('Method not allowed', HTTP_STATUS.METHOD_NOT_ALLOWED);
}

export async function DELETE() {
  return createErrorResponse('Method not allowed', HTTP_STATUS.METHOD_NOT_ALLOWED);
}