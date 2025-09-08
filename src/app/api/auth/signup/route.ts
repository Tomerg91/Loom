import { NextRequest } from 'next/server';
import { createAuthService } from '@/lib/auth/auth';
import { strongPasswordSchema } from '@/lib/security/password';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  withErrorHandling,
  validateRequestBody,
  rateLimit,
  HTTP_STATUS,
  withRequestLogging
} from '@/lib/api/utils';
import { createCorsResponse, applyCorsHeaders } from '@/lib/security/cors';
import { z } from 'zod';

// Enhanced signup schema with comprehensive security validations
const signUpSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .min(5, 'Email must be at least 5 characters')
    .max(254, 'Email must be less than 255 characters')
    .toLowerCase()
    .refine(email => {
      // Basic email security checks
      const blockedDomains = ['tempmail.com', '10minutemail.com', 'guerrillamail.com'];
      const domain = email.split('@')[1];
      return !blockedDomains.includes(domain);
    }, { message: 'Email domain not allowed' }),
  password: strongPasswordSchema,
  // Allow international names, including Hebrew letters
  firstName: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters')
    .regex(/^[\p{L}\p{M}\s\-']+$/u, 'First name contains invalid characters'),
  lastName: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters')
    .regex(/^[\p{L}\p{M}\s\-']+$/u, 'Last name contains invalid characters'),
  role: z.enum(['client', 'coach'], {
    errorMap: () => ({ message: 'Role must be client or coach' })
  }),
  phone: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
    .optional(),
  language: z.enum(['en', 'he'], {
    errorMap: () => ({ message: 'Language must be en or he' })
  }).default('he'),
  acceptedTerms: z.boolean()
    .refine(val => val === true, { message: 'You must accept the terms and conditions' }),
});

// Apply rate limiting to prevent abuse
const rateLimitedHandler = rateLimit(5, 60000, { // 5 requests per minute
  blockDuration: 15 * 60 * 1000, // 15 minutes block
  enableSuspiciousActivityDetection: true
});

// Main POST handler with comprehensive security
export const POST = withErrorHandling(
  withRequestLogging(rateLimitedHandler(async (request: NextRequest) => {
    try {
      // Parse and validate request body with security measures
      const body = await request.json();
      const validation = validateRequestBody(signUpSchema, body, {
        sanitize: true,
        maxDepth: 5,
        maxSize: 10 * 1024 // 10KB limit
      });

      if (!validation.success) {
        // Log signup attempt for security monitoring
        console.warn('Invalid signup attempt:', {
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

      const { acceptedTerms, ...rest } = validation.data;
      
      // Ensure language is always present (Zod default should handle this, but TypeScript needs assurance)
      const signupData = {
        ...rest,
        language: rest.language || 'he' as const
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
      const { user, error } = await authService.signUp(signupData);

      if (error) {
        // Log failed signup for security monitoring
        console.warn('Signup failed:', {
          email: signupData.email,
          role: signupData.role,
          error,
          timestamp: new Date().toISOString(),
          ip: request.headers.get('x-forwarded-for') || 'unknown'
        });
        
        // Return generic error message to prevent enumeration
        if (error.includes('already registered') || error.includes('already exists')) {
          return createErrorResponse(
            'An account with this email already exists',
            HTTP_STATUS.CONFLICT
          );
        }
        
        return createErrorResponse(
          'Failed to create account. Please try again.',
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
          status: user.status
        },
        message: 'Account created successfully. Please check your email for verification.'
      }, 'User account created successfully', HTTP_STATUS.CREATED);

      return applyCorsHeaders(response, request);
      
    } catch (error) {
      // Log error for monitoring
      console.error('Signup error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });
      
      return createErrorResponse(
        'An unexpected error occurred during signup',
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }
  }), { name: 'auth:signup' })
);

// Handle CORS preflight requests
export function OPTIONS(request: NextRequest) {
  return createCorsResponse(request);
}
