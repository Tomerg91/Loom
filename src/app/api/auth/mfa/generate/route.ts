/**
 * MFA Generation API Endpoint
 * POST /api/auth/mfa/generate
 * 
 * Generates secure TOTP secret and backup codes for MFA setup.
 * This endpoint provides cryptographically secure data for MFA initialization.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAuthService } from '@/lib/auth/auth';
import { createMfaService, getClientIP, getUserAgent } from '@/lib/services/mfa-service';

// Request validation schema
const generateRequestSchema = z.object({
  // No additional fields required - uses authenticated user context
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

    // Validate request body
    try {
      await generateRequestSchema.parseAsync(await request.json().catch(() => ({})));
    } catch (validationError) {
      return NextResponse.json(
        { error: 'Invalid request format' },
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

    // Generate secure MFA data
    const { data: setupData, error } = await mfaService.generateMfaSetup(user.id, user.email);

    if (error || !setupData) {
      console.error('Failed to generate MFA setup:', error);
      return NextResponse.json(
        { error: error || 'Failed to generate MFA setup' },
        { status: 500 }
      );
    }

    // Extract client information for audit logging
    const ipAddress = getClientIP(request);
    const userAgent = getUserAgent(request);

    // Store the generated secret temporarily for verification
    // In production, you might want to store this in a secure temporary store
    // with expiration to prevent indefinite storage of unverified secrets

    return NextResponse.json({
      success: true,
      data: {
        secret: setupData.secret,
        qrCodeUrl: setupData.qrCodeUrl,
        manualEntryKey: setupData.manualEntryKey,
        backupCodes: setupData.backupCodes,
        appName: process.env.MFA_ISSUER_NAME || 'Loom',
        accountName: user.email,
      },
    });

  } catch (error) {
    console.error('MFA generation error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate MFA data',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined 
      },
      { status: 500 }
    );
  }
}

// Prevent other HTTP methods for security
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