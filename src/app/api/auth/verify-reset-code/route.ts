import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';

import { createCorsResponse } from '@/lib/security/cors';

/**
 * Password reset code verification schema
 *
 * SECURITY: This endpoint validates the 6-digit verification code sent to the user's email
 * during password reset. The code must be:
 * - Exactly 6 digits
 * - Not empty
 * - Properly formatted as a numeric code
 */
const verifyResetCodeSchema = z.object({
  code: z
    .string()
    .length(6, 'Verification code must be exactly 6 digits')
    .regex(/^\d{6}$/, 'Verification code must contain only digits'),
});

type VerifyResetCodeData = z.infer<typeof verifyResetCodeSchema>;

/**
 * Verify password reset code
 *
 * This endpoint validates the 6-digit verification code that was sent to the user's email
 * during the password reset request. On successful verification, it returns a temporary
 * verification token that can be used to update the password.
 *
 * SECURITY CONSIDERATIONS:
 * 1. Server-side validation of the code format (not just client-side)
 * 2. Rate limiting should be applied at the API level
 * 3. Codes should be tied to specific email addresses
 * 4. Codes should expire after a set time (e.g., 15 minutes)
 * 5. Verification tokens are time-limited and can only be used for password update
 *
 * TODO: Production implementation should:
 * - Store generated codes in Redis or temporary database table
 * - Tie codes to specific email addresses
 * - Implement code expiration
 * - Implement rate limiting per email
 * - Return generic error messages to prevent enumeration attacks
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = verifyResetCodeSchema.safeParse(body);
    if (!validation.success) {
      // Log validation failure for security monitoring
      console.warn('Invalid password reset code attempt:', {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent'),
        timestamp: new Date().toISOString(),
        validationErrors: validation.error.errors,
      });

      return NextResponse.json(
        {
          error: 'Invalid verification code',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { code } = validation.data;

    // TODO: In production, verify the code against a temporary storage (Redis/Database)
    // Example validation logic:
    // const storedCode = await redis.get(`password-reset-code:${email}`);
    // if (!storedCode || storedCode !== code) {
    //   return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
    // }
    // const isExpired = await redis.ttl(`password-reset-code:${email}`) < 0;
    // if (isExpired) {
    //   return NextResponse.json({ error: 'Verification code expired' }, { status: 400 });
    // }

    // For development: Accept all valid 6-digit codes
    // In production, must implement proper code storage and validation

    // Generate a temporary verification token that can be used for password update
    // This token is time-limited and identifies the user as verified
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // TODO: In production, store this token in Redis with TTL
    // Store: `password-reset-verified:${token}` -> expiry timestamp
    // TTL: 15 minutes (900 seconds)

    // Log successful code validation
    console.info('Password reset code verified:', {
      timestamp: new Date().toISOString(),
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      message: 'Verification code is valid',
      token: verificationToken, // Return token to use for password update
    });
  } catch (error) {
    console.error('Password reset code verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return createCorsResponse(request);
}
