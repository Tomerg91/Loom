/**
 * MFA Disable API Endpoint
 * POST /api/auth/mfa/disable
 * 
 * Disables MFA for a user after verifying their TOTP code.
 * This removes all MFA data and requires re-setup if user wants to enable MFA again.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createMfaService, getClientIP, getUserAgent } from '@/lib/services/mfa-service';
import { createAuthService } from '@/lib/auth/auth';
import { z } from 'zod';

// Request validation schema
const disableRequestSchema = z.object({
  totpCode: z.string()
    .length(6, 'TOTP code must be exactly 6 digits')
    .regex(/^\d{6}$/, 'TOTP code must contain only digits'),
  confirmationText: z.string()
    .refine(val => val === 'DISABLE MFA', 'Must type "DISABLE MFA" to confirm'),
});

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const authService = createAuthService(true);
    const user = await authService.getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    let requestData;
    try {
      const body = await request.json();
      requestData = await disableRequestSchema.parseAsync(body);
    } catch (validationError) {
      return NextResponse.json(
        { 
          error: 'Invalid request format',
          details: validationError instanceof z.ZodError ? validationError.errors : undefined
        },
        { status: 400 }
      );
    }

    // Check if user has MFA enabled
    const mfaService = createMfaService(true);
    const currentStatus = await mfaService.getMFAStatus(user.id);

    if (!currentStatus.isEnabled) {
      return NextResponse.json(
        { error: 'MFA is not currently enabled for this user' },
        { status: 400 }
      );
    }

    // Extract client information for audit logging
    const ipAddress = getClientIP(request);
    const userAgent = getUserAgent(request);

    // Verify TOTP code and disable MFA
    const result = await mfaService.disableMFA(
      user.id,
      requestData.totpCode,
      ipAddress,
      userAgent
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to verify TOTP code' },
        { status: 400 }
      );
    }

    // Get updated MFA status to confirm it's disabled
    const updatedStatus = await mfaService.getMFAStatus(user.id);

    return NextResponse.json({
      success: true,
      message: 'MFA has been successfully disabled',
      data: {
        isEnabled: updatedStatus.isEnabled,
        isSetup: updatedStatus.isSetup,
        backupCodesRemaining: updatedStatus.backupCodesRemaining,
      },
      warning: 'You will need to complete the full setup process again if you want to re-enable MFA.',
    });

  } catch (error) {
    console.error('MFA disable error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to disable MFA',
        details: process.env.NODE_ENV === 'development' ? error : undefined 
      },
      { status: 500 }
    );
  }
}

// Prevent other HTTP methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

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