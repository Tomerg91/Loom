import { NextRequest, NextResponse } from 'next/server';
import { createAuthService } from '@/lib/auth/auth';
import { handlePreflight } from '@/lib/api/utils';

export async function GET(_request: NextRequest) {
  try {
    const authService = createAuthService(true);
    const session = await authService.getSession();

    if (!session) {
      return NextResponse.json(
        { 
          success: true,
          session: null,
          authenticated: false
        }
      );
    }

    // Get user details
    const user = await authService.getCurrentUser();

    return NextResponse.json({
      success: true,
      session: {
        access_token: session.access_token,
        token_type: session.token_type,
        expires_in: session.expires_in,
        expires_at: session.expires_at,
        refresh_token: session.refresh_token,
      },
      user: user ? {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        language: user.language,
      } : null,
      authenticated: !!user
    });

  } catch (error) {
    console.error('Get session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest) {
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
      message: 'Session terminated successfully'
    });

  } catch (error) {
    console.error('Delete session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return handlePreflight(request);
}