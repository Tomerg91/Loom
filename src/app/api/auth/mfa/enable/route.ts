/**
 * MFA Enable API Endpoint
 * POST /api/auth/mfa/enable
 * 
 * Enables MFA for a user after verifying their TOTP code.
 * This completes the MFA setup process initiated by the setup endpoint.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createMfaService, getClientIP, getUserAgent } from '@/lib/services/mfa-service';
import { createAuthService } from '@/lib/auth/auth';
import { z } from 'zod';

// Request validation schema
const enableRequestSchema = z.object({
  totpCode: z.string()
    .length(6, 'TOTP code must be exactly 6 digits')
    .regex(/^\d{6}$/, 'TOTP code must contain only digits'),
  secret: z.string().min(1, 'Secret is required'),
  backupCodes: z.array(z.string()).min(1, 'Backup codes are required'),
});

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const authService = await createAuthService(true);
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
      requestData = await enableRequestSchema.parseAsync(body);
    } catch (validationError) {
      return NextResponse.json(
        { 
          error: 'Invalid request format',
          details: validationError instanceof z.ZodError ? validationError.errors : undefined
        },
        { status: 400 }
      );
    }

    // Check if user already has MFA enabled
    const mfaService = createMfaService(true);
    const currentStatus = await mfaService.getMFAStatus(user.id);

    if (currentStatus.isEnabled) {
      return NextResponse.json(
        { error: 'MFA is already enabled for this user' },
        { status: 409 }
      );
    }

    // Extract client information for audit logging
    const ipAddress = getClientIP(request);
    const userAgent = getUserAgent(request);

    // Enable MFA with the provided secret, verification code, and backup codes
    const { success: enableSuccess, error: enableError } = await mfaService.enableMfa(
      user.id,
      requestData.secret,
      requestData.totpCode,
      requestData.backupCodes
    );

    if (!enableSuccess) {
      return NextResponse.json(
        { error: enableError || 'Failed to verify TOTP code' },
        { status: 400 }
      );
    }

    // Get updated MFA status
    const updatedStatus = await mfaService.getMFAStatus(user.id);

    return NextResponse.json({
      success: true,
      message: 'MFA has been successfully enabled',
      data: {
        isEnabled: updatedStatus.isEnabled,
        verifiedAt: updatedStatus.verifiedAt,
        backupCodesRemaining: updatedStatus.backupCodesRemaining,
      },
    });

  } catch (error) {
    console.error('MFA enable error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to enable MFA',
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