import { NextRequest, NextResponse } from 'next/server';

import { handlePreflight } from '@/lib/api/utils';
import { createAuthService } from '@/lib/auth/auth';
import { logger } from '@/lib/logger';

export async function POST(_request: NextRequest) {
  try {
    const authService = createAuthService(true);
    const { error } = await authService.signOut();

    if (error) {
      return NextResponse.json(
        { error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully signed out'
    });

  } catch (error) {
    logger.error('Sign-out error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return handlePreflight(request);
}