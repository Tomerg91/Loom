/**
 * MFA Backup Codes API Endpoint
 * GET /api/auth/mfa/backup-codes - Get remaining backup codes count
 * POST /api/auth/mfa/backup-codes - Generate new backup codes
 * 
 * Manages backup codes for MFA. Users can check how many backup codes they have
 * remaining and generate new ones by providing a valid TOTP code.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAuthService } from '@/lib/auth/auth';
import { createMfaService, getClientIP, getUserAgent } from '@/lib/services/mfa-service';

// Request validation schema for POST (regenerate codes)
const regenerateRequestSchema = z.object({
  totpCode: z.string()
    .length(6, 'TOTP code must be exactly 6 digits')
    .regex(/^\d{6}$/, 'TOTP code must contain only digits'),
});

// GET - Check backup codes status
export async function GET(request: NextRequest) {
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

    // Get MFA status
    const mfaService = createMfaService(true);
    const mfaStatus = await mfaService.getMFAStatus(user.id);

    if (!mfaStatus.isEnabled) {
      return NextResponse.json(
        { error: 'MFA is not enabled for this user' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        backupCodesRemaining: mfaStatus.backupCodesRemaining,
        hasBackupCodes: mfaStatus.backupCodesRemaining > 0,
        warning: mfaStatus.backupCodesRemaining <= 2 && mfaStatus.backupCodesRemaining > 0
          ? 'You have few backup codes remaining. Consider generating new ones.'
          : undefined,
        alert: mfaStatus.backupCodesRemaining === 0
          ? 'You have no backup codes remaining. Generate new ones immediately to avoid being locked out.'
          : undefined,
      },
    });

  } catch (error) {
    console.error('Backup codes status error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get backup codes status',
        details: process.env.NODE_ENV === 'development' ? error : undefined 
      },
      { status: 500 }
    );
  }
}

// POST - Generate new backup codes
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
      requestData = await regenerateRequestSchema.parseAsync(body);
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
        { error: 'MFA is not enabled for this user' },
        { status: 400 }
      );
    }

    // Extract client information for audit logging
    const ipAddress = getClientIP(request);
    const userAgent = getUserAgent(request);

    // Regenerate backup codes after verifying TOTP
    const result = await mfaService.regenerateBackupCodesWithVerification(
      user.id,
      requestData.totpCode,
      ipAddress,
      userAgent
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to regenerate backup codes' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'New backup codes generated successfully',
      data: {
        backupCodes: result.backupCodes,
        codesCount: result.backupCodes?.length || 0,
      },
      warning: 'Store these backup codes in a safe place. You will not be able to see them again.',
      instructions: [
        'Each backup code can only be used once',
        'Store them in a secure location separate from your authenticator app',
        'Use backup codes only when you cannot access your authenticator app',
        'Generate new backup codes if you run low (fewer than 3 remaining)',
      ],
    });

  } catch (error) {
    console.error('Backup codes regenerate error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to regenerate backup codes',
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