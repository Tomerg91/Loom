import { NextRequest } from 'next/server';
import { createAuthService } from '@/lib/auth/auth';
import { createCorsResponse, applyCorsHeaders } from '@/lib/security/cors';
import { basicPasswordSchema } from '@/lib/security/password';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  withErrorHandling,
  validateRequestBody,
  rateLimit,
  HTTP_STATUS
} from '@/lib/api/utils';
import { z } from 'zod';

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
  rateLimitedHandler(async (request: NextRequest) => {
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

      // Create auth service and attempt signin
      const authService = createAuthService(true);
      const { user, error } = await authService.signIn({ email, password });

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

      // Log successful signin for auditing
      console.info('User signin successful:', {
        userId: user.id,
        email: user.email,
        role: user.role,
        rememberMe,
        timestamp: new Date().toISOString(),
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });

      // Return sanitized user data
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
          lastSeenAt: user.lastSeenAt
        },
        message: 'Successfully signed in'
      }, 'Authentication successful');

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
  })
);

// Handle CORS preflight requests
export function OPTIONS(request: NextRequest) {
  return createCorsResponse(request);
}