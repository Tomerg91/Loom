import { NextRequest } from 'next/server';
import { z } from 'zod';

import {
  createSuccessResponse,
  createErrorResponse,
  withErrorHandling,
  validateRequestBody,
  rateLimit,
  HTTP_STATUS,
  withRequestLogging,
} from '@/lib/api/utils';
import { createAuthService } from '@/lib/auth/auth';
import { createCorsResponse } from '@/lib/security/cors';

const resendSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .min(5, 'Email must be at least 5 characters')
    .max(254, 'Email must be less than 255 characters')
    .toLowerCase(),
});

// Rate limiting: max 3 resend attempts per 15 minutes per email
const rateLimitedHandler = rateLimit(3, 15 * 60 * 1000, {
  blockDuration: 60 * 60 * 1000, // 1 hour block
  enableSuspiciousActivityDetection: true,
});

export const POST = withErrorHandling(
  withRequestLogging(
    rateLimitedHandler(async (request: NextRequest) => {
      try {
        const body = await request.json();
        const validation = validateRequestBody(resendSchema, body, {
          sanitize: true,
          maxDepth: 3,
          maxSize: 1024, // 1KB limit
        });

        if (!validation.success) {
          return createErrorResponse(
            {
              code: 'VALIDATION_ERROR',
              message: 'Invalid email address',
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              details: (validation.error as any).details,
            },
            HTTP_STATUS.BAD_REQUEST
          );
        }

        const { email } = validation.data;
        const authService = createAuthService(true);

        // Determine email verification redirect URL
        const siteUrl =
          process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        const emailRedirectTo = `${siteUrl}/api/auth/verify`;

        // Resend confirmation email using Supabase
        const { error } = await authService.resendConfirmationEmail(
          email,
          emailRedirectTo
        );

        if (error) {
          // Don't reveal if email exists for security
          console.warn('Resend verification failed:', { email, error });

          // Return success even if email doesn't exist (security best practice)
          return createSuccessResponse(
            {
              message:
                'If an account with this email exists, a verification email has been sent.',
            },
            'Verification email sent',
            HTTP_STATUS.OK
          );
        }

        // Log successful resend for auditing
        console.info('Verification email resent:', {
          email,
          timestamp: new Date().toISOString(),
          ip: request.headers.get('x-forwarded-for') || 'unknown',
        });

        const response = createSuccessResponse(
          {
            message:
              'Verification email has been sent. Please check your inbox.',
          },
          'Verification email sent successfully',
          HTTP_STATUS.OK
        );

        return applyCorsHeaders(response, request);
      } catch (error) {
        console.error('Resend verification error:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
          ip: request.headers.get('x-forwarded-for') || 'unknown',
        });

        return createErrorResponse(
          'An unexpected error occurred while sending verification email',
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
      }
    }),
    { name: 'auth:resend-verification' }
  )
);

export function OPTIONS(request: NextRequest) {
  return createCorsResponse(request);
}
