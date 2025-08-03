/**
 * MFA Backup Code Verification API Endpoint
 * POST /api/auth/mfa/verify-backup
 * 
 * Verifies backup codes during login process.
 * This is a specialized endpoint for backup code verification with additional validation.
 * Each backup code can only be used once and is immediately consumed upon successful verification.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createMfaService, getClientIP, getUserAgent } from '@/lib/services/mfa-service';
import { z } from 'zod';

// Request validation schema
const verifyBackupRequestSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  backupCode: z.string()
    .length(8, 'Backup code must be exactly 8 characters')
    .regex(/^[A-Z0-9]+$/, 'Backup code must contain only uppercase letters and numbers')
    .transform(val => val.toUpperCase()), // Ensure uppercase
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    let requestData;
    try {
      const body = await request.json();
      requestData = await verifyBackupRequestSchema.parseAsync(body);
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

    // Get current MFA status to check backup codes availability
    const mfaStatus = await mfaService.getMFAStatus(requestData.userId);
    
    if (mfaStatus.backupCodesRemaining === 0) {
      // Log the attempt for security monitoring
      await mfaService.verifyMFA(
        requestData.userId,
        requestData.backupCode,
        'backup_code',
        ipAddress,
        userAgent
      );

      return NextResponse.json(
        { 
          error: 'No backup codes available. Please use your authenticator app or contact support.',
          code: 'NO_BACKUP_CODES'
        },
        { status: 400 }
      );
    }

    // Verify the backup code
    const result = await mfaService.verifyMFA(
      requestData.userId,
      requestData.backupCode,
      'backup_code',
      ipAddress,
      userAgent
    );

    if (!result.success) {
      // Return specific error messages for different failure scenarios
      let status = 400;
      let errorMessage = result.error || 'Backup code verification failed';
      let errorCode = 'VERIFICATION_FAILED';
      
      if (errorMessage.includes('Too many attempts')) {
        status = 429; // Rate limited
        errorCode = 'RATE_LIMITED';
      } else if (errorMessage.includes('not enabled')) {
        status = 403; // Forbidden
        errorCode = 'MFA_NOT_ENABLED';
      } else if (errorMessage.includes('Invalid')) {
        errorCode = 'INVALID_CODE';
      }

      return NextResponse.json(
        { 
          error: errorMessage,
          code: errorCode
        },
        { status }
      );
    }

    // Get updated MFA status after backup code usage
    const updatedMfaStatus = await mfaService.getMFAStatus(requestData.userId);

    // Prepare response with warnings if backup codes are running low
    let warning: string | undefined;
    let alert: string | undefined;

    if (updatedMfaStatus.backupCodesRemaining === 0) {
      alert = 'This was your last backup code. Generate new backup codes immediately to avoid being locked out.';
    } else if (updatedMfaStatus.backupCodesRemaining <= 2) {
      warning = `You have only ${updatedMfaStatus.backupCodesRemaining} backup codes remaining. Consider generating new ones.`;
    }

    return NextResponse.json({
      success: true,
      message: 'Backup code verification successful',
      data: {
        verified: true,
        method: 'backup_code',
        backupCodesRemaining: updatedMfaStatus.backupCodesRemaining,
        codeConsumed: true,
      },
      warning,
      alert,
      recommendations: updatedMfaStatus.backupCodesRemaining <= 2 ? [
        'Generate new backup codes as soon as possible',
        'Store backup codes in a secure location',
        'Consider using your authenticator app when available',
      ] : undefined,
    });

  } catch (error) {
    console.error('Backup code verify error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to verify backup code',
        code: 'SYSTEM_ERROR',
        details: process.env.NODE_ENV === 'development' ? error : undefined 
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check backup code availability
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
    const mfaStatus = await mfaService.getMFAStatus(userId);

    if (!mfaStatus.isEnabled) {
      return NextResponse.json(
        { error: 'MFA is not enabled for this user' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        backupCodesAvailable: mfaStatus.backupCodesRemaining > 0,
        backupCodesRemaining: mfaStatus.backupCodesRemaining,
        canUseBackupCodes: mfaStatus.isEnabled && mfaStatus.backupCodesRemaining > 0,
      },
    });

  } catch (error) {
    console.error('Backup code availability check error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to check backup code availability',
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