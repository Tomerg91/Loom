/**
 * MFA Verify API Endpoint
 * POST /api/auth/mfa/verify
 *
 * Verifies MFA codes during login process.
 * Supports both TOTP codes and backup codes.
 * This endpoint is called after initial username/password authentication.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';

import {
  createSuccessResponse,
  createErrorResponse,
  withErrorHandling,
  HTTP_STATUS,
} from '@/lib/api/utils';
import { rateLimit } from '@/lib/security/rate-limit';
import { createMfaService, getClientIP, getUserAgent } from '@/lib/services/mfa-service';
import { logger } from '@/lib/logger';

// Cookie name for MFA trusted device token
const MFA_TRUSTED_DEVICE_COOKIE = 'mfa_trusted_device';


// Request validation schema
const verifyRequestSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  code: z
    .string()
    .min(6, 'Code must be at least 6 characters')
    .max(8, 'Code must be at most 8 characters')
    .regex(
      /^[A-Z0-9]+$/,
      'Code must contain only uppercase letters and numbers'
    ),
  method: z.enum(['totp', 'backup_code']).default('totp'),
  rememberDevice: z.boolean().optional(),
});

// Apply strict rate limiting for MFA verification to prevent brute force attacks
const rateLimitedHandler = rateLimit(10, 60000, {
  // 10 attempts per minute
  blockDuration: 30 * 60 * 1000, // 30 minutes block for failed attempts
  enableSuspiciousActivityDetection: true,
  skipSuccessfulRequests: false, // Count all MFA attempts
});

export const POST = withErrorHandling(
  rateLimitedHandler(async (request: NextRequest) => {
    try {
      // Parse and validate request body
      let requestData;
      try {
        const body = await request.json();
        requestData = await verifyRequestSchema.parseAsync(body);
      } catch (validationError) {
        // Log invalid MFA verification attempt
        logger.warn('Invalid MFA verification attempt:', {
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent'),
          timestamp: new Date().toISOString(),
          validationError:
            validationError instanceof z.ZodError
              ? validationError.errors
              : validationError,
        });

        return createErrorResponse(
          'Invalid request format',
          HTTP_STATUS.BAD_REQUEST
        );
      }

      // Extract client information for audit logging
      const ipAddress = getClientIP(request);
      const userAgent = getUserAgent(request);

      // Log MFA verification attempt for security monitoring
      logger.info('MFA verification attempt:', {
        userId: requestData.userId,
        method: requestData.method,
        ipAddress,
        userAgent,
        timestamp: new Date().toISOString(),
      });

      // Initialize MFA service
      const mfaService = createMfaService(true);

      // Check if user requires MFA
      const requiresMFA = await mfaService.requiresMFA(requestData.userId);
      if (!requiresMFA) {
        logger.warn('MFA verification attempted for user without MFA:', {
          userId: requestData.userId,
          ipAddress,
          timestamp: new Date().toISOString(),
        });

        return createErrorResponse(
          'MFA is not enabled for this user',
          HTTP_STATUS.BAD_REQUEST
        );
      }

      // Verify the MFA code
      const result = await mfaService.verifyMFA(
        requestData.userId,
        requestData.code,
        requestData.method,
        ipAddress,
        userAgent
      );

      if (!result.success) {
        // Log failed MFA verification for security monitoring
        logger.warn('MFA verification failed:', {
          userId: requestData.userId,
          method: requestData.method,
          error: result.error,
          ipAddress,
          userAgent,
          timestamp: new Date().toISOString(),
        });

        // Return specific error messages for different failure scenarios
        let status: number = HTTP_STATUS.BAD_REQUEST;
        const errorMessage = result.error || 'MFA verification failed';
        
        if (errorMessage.includes('Too many attempts')) {
          status = HTTP_STATUS.TOO_MANY_REQUESTS;
        } else if (errorMessage.includes('not enabled')) {
          status = HTTP_STATUS.FORBIDDEN;
        }

        return createErrorResponse(errorMessage, status);
      }

      // Get updated MFA status (e.g., remaining backup codes)
      const mfaStatus = await mfaService.getMFAStatus(requestData.userId);

      // Log successful MFA verification for auditing
      logger.info('MFA verification successful:', {
        userId: requestData.userId,
        method: requestData.method,
        backupCodesRemaining: mfaStatus.backupCodesRemaining,
        ipAddress,
        timestamp: new Date().toISOString(),
      });

      let trustedDeviceCookie: { value: string; maxAge: number } | null = null;
      if (requestData.rememberDevice) {
        const tokenResult = await mfaService.issueTrustedDeviceToken({
          userId: requestData.userId,
          ipAddress,
          userAgent,
        });

        if (tokenResult.success) {
          trustedDeviceCookie = {
            value: `${tokenResult.deviceId}.${tokenResult.token}`,
            maxAge: tokenResult.maxAgeSeconds,
          };
        } else {
          logger.warn('Trusted device token issuance failed:', {
            userId: requestData.userId,
            error: tokenResult.error,
          });
        }
      }

      const response = createSuccessResponse(
        {
          verified: true,
          method: requestData.method,
          backupCodesRemaining: mfaStatus.backupCodesRemaining,
          // Include warning if backup codes are running low
          warning:
            mfaStatus.backupCodesRemaining > 0 &&
            mfaStatus.backupCodesRemaining <= 2
              ? 'You have few backup codes remaining. Consider generating new ones.'
              : undefined,
        },
        'MFA verification successful'
      );

      if (trustedDeviceCookie) {
        response.cookies.set({
          name: MFA_TRUSTED_DEVICE_COOKIE,
          value: trustedDeviceCookie.value,
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: trustedDeviceCookie.maxAge,
          path: '/',
        });
      } else {
        response.cookies.set({
          name: MFA_TRUSTED_DEVICE_COOKIE,
          value: '',
          maxAge: 0,
          path: '/',
        });
      }

      return response;
    } catch (error) {
      // Log error for monitoring
      logger.error('MFA verify error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });

      return createErrorResponse(
        'Failed to verify MFA code',
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  })
);

// Apply rate limiting to GET endpoint as well to prevent enumeration
const rateLimitedGetHandler = rateLimit(30, 60000); // 30 requests per minute

// GET endpoint to check MFA requirement for a user
export const GET = withErrorHandling(
  rateLimitedGetHandler(async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const userId = searchParams.get('userId');

      if (!userId) {
        return createErrorResponse(
          'Missing userId parameter',
          HTTP_STATUS.BAD_REQUEST
        );
      }

      // Validate UUID format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        logger.warn('Invalid MFA status check attempt:', {
          userId,
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          timestamp: new Date().toISOString(),
        });

        return createErrorResponse(
          'Invalid userId format',
          HTTP_STATUS.BAD_REQUEST
        );
      }

      const mfaService = createMfaService(true);
      const requiresMFA = await mfaService.requiresMFA(userId);
      const mfaStatus = await mfaService.getMFAStatus(userId);

      return createSuccessResponse(
        {
          requiresMFA,
          isEnabled: mfaStatus.isEnabled,
          isSetup: mfaStatus.isSetup,
          backupCodesAvailable: mfaStatus.backupCodesRemaining > 0,
        },
        'MFA status retrieved successfully'
      );
    } catch (error) {
      // Log error for monitoring
      logger.error('MFA status check error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });

      return createErrorResponse(
        'Failed to check MFA status',
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  })
);

// Prevent other HTTP methods
export async function PUT() {
  return createErrorResponse(
    'Method not allowed',
    HTTP_STATUS.METHOD_NOT_ALLOWED
  );
}

export async function DELETE() {
  return createErrorResponse(
    'Method not allowed',
    HTTP_STATUS.METHOD_NOT_ALLOWED
  );
}
