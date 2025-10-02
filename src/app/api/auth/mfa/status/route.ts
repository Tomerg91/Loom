/**
 * MFA Status API Endpoint
 * GET /api/auth/mfa/status
 * 
 * Returns the current MFA status for the authenticated user.
 * This endpoint provides information about MFA setup, enabled state, and backup codes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createMfaService } from '@/lib/services/mfa-service';
import { createAuthService } from '@/lib/auth/auth';

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

    // Determine the current state and next recommended actions
    let state: string;
    let nextActions: string[] = [];

    if (!mfaStatus.isSetup && !mfaStatus.isEnabled) {
      state = 'not_setup';
      nextActions = ['Set up MFA to enhance your account security'];
    } else if (mfaStatus.isSetup && !mfaStatus.isEnabled) {
      state = 'setup_incomplete';
      nextActions = ['Complete MFA setup by verifying your authenticator app'];
    } else if (mfaStatus.isEnabled) {
      state = 'enabled';
      if (mfaStatus.backupCodesRemaining === 0) {
        nextActions = ['Generate new backup codes immediately'];
      } else if (mfaStatus.backupCodesRemaining <= 2) {
        nextActions = ['Consider generating new backup codes'];
      }
    } else {
      state = 'unknown';
    }

    return NextResponse.json({
      success: true,
      data: {
        // Basic MFA status
        isEnabled: mfaStatus.isEnabled,
        isSetup: mfaStatus.isSetup,
        verifiedAt: mfaStatus.verifiedAt,
        
        // Backup codes information
        backupCodesRemaining: mfaStatus.backupCodesRemaining,
        hasBackupCodes: mfaStatus.backupCodesRemaining > 0,
        
        // State and recommendations
        state,
        nextActions,
        
        // Warnings and alerts
        warnings: [
          ...(mfaStatus.backupCodesRemaining === 0 && mfaStatus.isEnabled 
            ? ['You have no backup codes remaining. Generate new ones immediately.'] 
            : []
          ),
          ...(mfaStatus.backupCodesRemaining > 0 && mfaStatus.backupCodesRemaining <= 2 && mfaStatus.isEnabled
            ? [`You have only ${mfaStatus.backupCodesRemaining} backup codes remaining.`]
            : []
          ),
        ],
        
        // Security recommendations
        recommendations: [
          ...(state === 'not_setup' 
            ? ['Enable MFA to protect your account from unauthorized access']
            : []
          ),
          ...(state === 'enabled' 
            ? [
                'Keep your backup codes in a secure location',
                'Use your authenticator app when possible',
                'Generate new backup codes if you have fewer than 3 remaining',
              ]
            : []
          ),
        ],
      },
      meta: {
        timestamp: new Date().toISOString(),
        userId: user.id,
        userEmail: user.email,
      },
    });

  } catch (error) {
    console.error('MFA status error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get MFA status',
        details: process.env.NODE_ENV === 'development' ? error : undefined 
      },
      { status: 500 }
    );
  }
}

// Prevent other HTTP methods
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed. Use GET to retrieve MFA status.' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use GET to retrieve MFA status.' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use GET to retrieve MFA status.' },
    { status: 405 }
  );
}