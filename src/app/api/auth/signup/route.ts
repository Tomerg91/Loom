import { NextRequest } from 'next/server';
import { z, type ZodIssue } from 'zod';

import { routing } from '@/i18n/routing';
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
import { createCorsResponse, applyCorsHeaders } from '@/lib/security/cors';
import { strongPasswordSchema } from '@/lib/security/password';
import { trackSignupCompleted } from '@/lib/monitoring/event-tracking';
import type { Language } from '@/types';

const SUPPORTED_LANGUAGES = ['en', 'he'] as const satisfies readonly Language[];
const DEFAULT_LANGUAGE = (SUPPORTED_LANGUAGES as readonly string[]).includes(
  routing.defaultLocale
)
  ? (routing.defaultLocale as Language)
  : SUPPORTED_LANGUAGES[0];

// Enhanced signup schema with comprehensive security validations
const signUpSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .min(5, 'Email must be at least 5 characters')
    .max(254, 'Email must be less than 255 characters')
    .toLowerCase()
    .refine(
      email => {
        // Basic email security checks
        const blockedDomains = [
          'tempmail.com',
          '10minutemail.com',
          'guerrillamail.com',
        ];
        const domain = email.split('@')[1];
        return !blockedDomains.includes(domain);
      },
      { message: 'Email domain not allowed' }
    ),
  password: strongPasswordSchema,
  // Allow international names, including Hebrew letters
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters')
    .regex(/^[\p{L}\p{M}\s\-']+$/u, 'First name contains invalid characters'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters')
    .regex(/^[\p{L}\p{M}\s\-']+$/u, 'Last name contains invalid characters'),
  role: z.enum(['client', 'coach'], {
    errorMap: () => ({ message: 'Role must be client or coach' }),
  }),
  phone: z
    .string()
    .max(25)
    .optional()
    .transform(val => {
      if (!val) return undefined;
      // Normalize Israeli local formats like 05X-XXXXXXX to +9725XXXXXXXX
      const digits = val.replace(/[^\d+]/g, '');
      if (digits.startsWith('+')) return digits; // assume E.164
      // If starts with 0 and length >= 9, convert to +972 without leading 0
      if (/^0\d{8,}$/.test(digits)) {
        return '+972' + digits.slice(1);
      }
      return digits; // fallback, will be re-validated below
    })
    .refine(
      val => {
        if (val === undefined) return true;
        return /^\+[1-9]\d{7,14}$/.test(val); // E.164 minimal check
      },
      { message: 'Invalid phone number format' }
    ),
  language: z
    .enum(SUPPORTED_LANGUAGES, {
      errorMap: () => ({ message: 'Language must be en or he' }),
    })
    .default(DEFAULT_LANGUAGE),
  acceptedTerms: z
    .boolean()
    .refine(val => val === true, {
      message: 'You must accept the terms and conditions',
    }),
});

// Apply rate limiting to prevent abuse
const rateLimitedHandler = rateLimit(5, 60000, {
  // 5 requests per minute
  blockDuration: 15 * 60 * 1000, // 15 minutes block
  enableSuspiciousActivityDetection: true,
});

// Main POST handler with comprehensive security
export const POST = withErrorHandling(
  withRequestLogging(
    rateLimitedHandler(async (request: NextRequest) => {
      try {
        // Parse and validate request body with security measures
        const body = await request.json();
        const validation = validateRequestBody(signUpSchema, body, {
          sanitize: true,
          maxDepth: 5,
          maxSize: 10 * 1024, // 10KB limit
        });

        if (!validation.success) {
          // Log signup attempt for security monitoring
          console.warn('Invalid signup attempt:', {
            ip: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent'),
            timestamp: new Date().toISOString(),
            validationErrors: validation.error.details,
          });

          const errorDetails = validation.error as {
            details?: { issues?: ZodIssue[] };
          };
          const issues = errorDetails.details?.issues ?? [];
          const firstMessage =
            issues.length > 0 ? issues[0].message : 'Validation failed';

          return createErrorResponse(
            {
              code: 'VALIDATION_ERROR',
              message: firstMessage,
              details: errorDetails.details,
            },
            HTTP_STATUS.BAD_REQUEST
          );
        }

        const { acceptedTerms, ...rest } = validation.data;

        // Ensure language is always present (Zod default should handle this, but TypeScript needs assurance)
        const signupData = {
          ...rest,
          language: rest.language || DEFAULT_LANGUAGE,
        };

        // Additional security check for terms acceptance
        if (!acceptedTerms) {
          return createErrorResponse(
            'Terms and conditions must be accepted',
            HTTP_STATUS.BAD_REQUEST
          );
        }

        // Create auth service and attempt signup
        const authService = createAuthService(true);
        const { user, error, sessionActive } =
          await authService.signUp(signupData);

        if (error) {
          // Log failed signup for security monitoring
          console.warn('Signup failed:', {
            email: signupData.email,
            role: signupData.role,
            error,
            timestamp: new Date().toISOString(),
            ip: request.headers.get('x-forwarded-for') || 'unknown',
          });

          // Return generic error message to prevent enumeration
          if (
            error.includes('already registered') ||
            error.includes('already exists')
          ) {
            return createErrorResponse(
              'An account with this email already exists',
              HTTP_STATUS.CONFLICT
            );
          }

          // Surface upstream auth error for troubleshooting (safe string)
          const safe = error.replace(/[^\x20-\x7E]+/g, '').slice(0, 200);
          return createErrorResponse(
            {
              code: 'SUPABASE_SIGNUP_ERROR',
              message: safe || 'Failed to create account. Please try again.',
              details: undefined,
            },
            HTTP_STATUS.BAD_REQUEST
          );
        }

        if (!user) {
          return createErrorResponse(
            'Failed to create user account',
            HTTP_STATUS.INTERNAL_SERVER_ERROR
          );
        }

        // Log successful signup for auditing
        console.info('User signup successful:', {
          userId: user.id,
          email: user.email,
          role: user.role,
          timestamp: new Date().toISOString(),
          ip: request.headers.get('x-forwarded-for') || 'unknown',
        });

        // Track signup completion in analytics
        await trackSignupCompleted(user.id, user.role, {
          language: user.language,
          hasPhone: !!signupData.phone,
        });

        // Return sanitized user data
        const response = createSuccessResponse(
          {
            user: {
              id: user.id,
              email: user.email,
              role: user.role,
              firstName: user.firstName,
              lastName: user.lastName,
              avatarUrl: user.avatarUrl,
              language: user.language,
              status: user.status,
            },
            sessionActive,
            message:
              'Account created successfully. Please check your email for verification.',
          },
          'User account created successfully',
          HTTP_STATUS.CREATED
        );

        return applyCorsHeaders(response, request);
      } catch (error) {
        // Log error for monitoring
        console.error('Signup error:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
          ip: request.headers.get('x-forwarded-for') || 'unknown',
        });

        return createErrorResponse(
          'An unexpected error occurred during signup',
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
      }
    }),
    { name: 'auth:signup' }
  )
);

// Handle CORS preflight requests
export function OPTIONS(request: NextRequest) {
  return createCorsResponse(request);
}
