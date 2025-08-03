/**
 * MFA Verify API Endpoint
 * POST /api/auth/mfa/verify
 * 
 * Verifies MFA codes during login process.
 * Supports both TOTP codes and backup codes.
 * This endpoint is called after initial username/password authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createMfaService, getClientIP, getUserAgent } from '@/lib/services/mfa-service';
import { createAuthService } from '@/lib/auth/auth';
import { z } from 'zod';

// Request validation schema
const verifyRequestSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  code: z.string()
    .min(6, 'Code must be at least 6 characters')
    .max(8, 'Code must be at most 8 characters')
    .regex(/^[A-Z0-9]+$/, 'Code must contain only uppercase letters and numbers'),
  method: z.enum(['totp', 'backup_code']).default('totp'),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    let requestData;
    try {
      const body = await request.json();
      requestData = await verifyRequestSchema.parseAsync(body);
    } catch (validationError) {
      return NextResponse.json(
        { 
          error: 'Invalid request format',
          details: validationError instanceof z.ZodError ? validationError.errors : undefined
        },
        { status: 400 }
      );
    }

    // Extract client information for audit logging
    const ipAddress = getClientIP(request);
    const userAgent = getUserAgent(request);

    // Initialize MFA service
    const mfaService = createMfaService(true);

    // Check if user requires MFA
    const requiresMFA = await mfaService.requiresMFA(requestData.userId);
    if (!requiresMFA) {
      return NextResponse.json(
        { error: 'MFA is not enabled for this user' },
        { status: 400 }
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
      // Return specific error messages for different failure scenarios
      let status = 400;
      let errorMessage = result.error || 'MFA verification failed';
      
      if (errorMessage.includes('Too many attempts')) {
        status = 429; // Rate limited
      } else if (errorMessage.includes('not enabled')) {
        status = 403; // Forbidden
      }

      return NextResponse.json(
        { error: errorMessage },
        { status }
      );
    }

    // Get updated MFA status (e.g., remaining backup codes)
    const mfaStatus = await mfaService.getMFAStatus(requestData.userId);

    return NextResponse.json({
      success: true,
      message: 'MFA verification successful',
      data: {
        verified: true,
        method: requestData.method,
        backupCodesRemaining: mfaStatus.backupCodesRemaining,
        // Include warning if backup codes are running low
        warning: mfaStatus.backupCodesRemaining > 0 && mfaStatus.backupCodesRemaining <= 2 
          ? 'You have few backup codes remaining. Consider generating new ones.' 
          : undefined,
      },
    });

  } catch (error) {
    console.error('MFA verify error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to verify MFA code',
        details: process.env.NODE_ENV === 'development' ? error : undefined 
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check MFA requirement for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return NextResponse.json(
        { error: 'Invalid userId format' },
        { status: 400 }
      );
    }

    const mfaService = createMfaService(true);
    const requiresMFA = await mfaService.requiresMFA(userId);
    const mfaStatus = await mfaService.getMFAStatus(userId);

    return NextResponse.json({
      success: true,
      data: {
        requiresMFA,
        isEnabled: mfaStatus.isEnabled,
        isSetup: mfaStatus.isSetup,
        backupCodesAvailable: mfaStatus.backupCodesRemaining > 0,
      },
    });

  } catch (error) {
    console.error('MFA status check error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to check MFA status',
        details: process.env.NODE_ENV === 'development' ? error : undefined 
      },
      { status: 500 }
    );
  }
}

// Prevent other HTTP methods
export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}