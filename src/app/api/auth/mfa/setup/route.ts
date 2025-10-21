/**
 * MFA Setup API Endpoint
 * POST /api/auth/mfa/setup
 * 
 * Initiates MFA setup for a user by generating a TOTP secret and QR code.
 * This endpoint requires authentication but does not enable MFA until verification.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAuthService } from '@/lib/auth/auth';
import { createMfaService, getClientIP, getUserAgent } from '@/lib/services/mfa-service';

// Request validation schema
const setupRequestSchema = z.object({
  // No additional fields required - uses authenticated user
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

    // Validate request body (empty for this endpoint)
    try {
      await setupRequestSchema.parseAsync(await request.json().catch(() => ({})));
    } catch (_validationError) {
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

    // Extract client information for audit logging
    const ipAddress = getClientIP(request);
    const userAgent = getUserAgent(request);

    // Setup MFA - generate secret, QR code, and backup codes
    const setupData = await mfaService.setupMFA(user.id, user.email);

    // Log the setup attempt for security monitoring
    // The MFA service handles internal event logging

    return NextResponse.json({
      success: true,
      data: {
        secret: setupData.secret,
        qrCodeUrl: setupData.qrCodeUrl,
        manualEntryKey: setupData.manualEntryKey,
        backupCodes: setupData.backupCodes,
        appName: 'Loom App',
        accountName: user.email,
      },
    });

  } catch (error) {
    console.error('MFA setup error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to setup MFA',
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