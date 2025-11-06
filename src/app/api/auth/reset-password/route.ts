import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { 
  createSuccessResponse, 
  createErrorResponse, 
  withErrorHandling,
  validateRequestBody,
  HTTP_STATUS
} from '@/lib/api/utils';
import { createAuthService } from '@/lib/auth/auth';
import { createCorsResponse, applyCorsHeaders } from '@/lib/security/cors';
import { rateLimit } from '@/lib/security/rate-limit';
import { logger } from '@/lib/logger';



const resetPasswordSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .min(5, 'Email must be at least 5 characters')
    .max(254, 'Email must be less than 255 characters')
    .toLowerCase(),
});

// Apply strict rate limiting for password reset to prevent abuse
const rateLimitedHandler = rateLimit(3, 60000, { // 3 attempts per minute
  blockDuration: 15 * 60 * 1000, // 15 minutes block for repeated attempts
  enableSuspiciousActivityDetection: true,
});

export const POST = withErrorHandling(
  rateLimitedHandler(async (request: NextRequest) => {
    try {
      // Parse and validate request body with security measures
      const body = await request.json();
      const validation = validateRequestBody(resetPasswordSchema, body, {
        sanitize: true,
        maxDepth: 3,
        maxSize: 2 * 1024 // 2KB limit for reset password
      });

      if (!validation.success) {
        // Log invalid reset password attempt for security monitoring
        logger.warn('Invalid password reset attempt:', {
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

      const { email } = validation.data;

      // Log password reset attempt for security monitoring
      logger.info('Password reset requested:', {
        email,
        timestamp: new Date().toISOString(),
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent')
      });

      const authService = createAuthService(true);
      const { error } = await authService.resetPassword(email);

      if (error) {
        // Log failed password reset for security monitoring
        logger.warn('Password reset failed:', {
          email,
          error,
          timestamp: new Date().toISOString(),
          ip: request.headers.get('x-forwarded-for') || 'unknown'
        });
        
        // Always return success to prevent user enumeration
        return createSuccessResponse({
          message: 'If an account with this email exists, a password reset link has been sent.'
        }, 'Password reset request processed');
      }

      // Log successful password reset for auditing
      logger.info('Password reset email sent:', {
        email,
        timestamp: new Date().toISOString(),
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });

      return createSuccessResponse({
        message: 'Password reset email sent successfully'
      }, 'Password reset email sent');

    } catch (error) {
      // Log error for monitoring
      logger.error('Password reset error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });
      
      return createErrorResponse(
        'An unexpected error occurred while processing your request',
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  })
);

export async function OPTIONS(request: NextRequest) {
  return createCorsResponse(request);
}