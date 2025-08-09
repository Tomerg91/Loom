import { NextRequest, NextResponse } from 'next/server';
import { createAuthService } from '@/lib/auth/auth';
import { z } from 'zod';
import { createCorsResponse, applyCorsHeaders } from '@/lib/security/cors';

const verifyTokenSchema = z.object({
  token_hash: z.string().min(1, 'Token hash is required'),
  type: z.enum(['signup', 'recovery', 'email_change', 'email', 'invite', 'magiclink']).default('signup'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = verifyTokenSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validation.error.errors 
        },
        { status: 400 }
      );
    }

    const authService = createAuthService(true);
    
    // For email verification, we'll use Supabase's built-in verification
    // This endpoint serves as a webhook/callback processor
    const { token_hash, type } = validation.data;

    try {
      // Verify the token with Supabase
      const { data, error } = await authService.verifyOtp({
        token_hash,
        type,
      });

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }

      if (!data.user) {
        return NextResponse.json(
          { error: 'Verification failed' },
          { status: 400 }
        );
      }

      // Get updated user profile
      const user = await authService.getCurrentUser();

      return NextResponse.json({
        success: true,
        user: user ? {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          avatarUrl: user.avatarUrl,
          language: user.language,
        } : null,
        message: 'Email verified successfully'
      });

    } catch (verifyError) {
      console.error('Token verification error:', verifyError);
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Verify endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token_hash = searchParams.get('token_hash');
    const type = searchParams.get('type') || 'signup';

    if (!token_hash) {
      return NextResponse.json(
        { error: 'Token hash is required' },
        { status: 400 }
      );
    }

    // Redirect to the frontend verification page with the token
    const frontendUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const redirectUrl = `${frontendUrl}/auth/verify?token_hash=${encodeURIComponent(token_hash)}&type=${encodeURIComponent(type)}`;
    
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('Verify GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return createCorsResponse(request);
}