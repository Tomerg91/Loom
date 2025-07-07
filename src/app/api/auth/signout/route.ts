import { NextRequest, NextResponse } from 'next/server';
import { createAuthService } from '@/lib/auth/auth';

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
    console.error('Sign-out error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}