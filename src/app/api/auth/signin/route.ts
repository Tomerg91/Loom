import { NextRequest, NextResponse } from 'next/server';
import { createAuthService } from '@/lib/auth/auth';
import { createCorsResponse } from '@/lib/security/cors';
import { basicPasswordSchema } from '@/lib/security/password';
import { z } from 'zod';

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: basicPasswordSchema,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = signInSchema.safeParse(body);
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
    const { user, error } = await authService.signIn(validation.data);

    if (error) {
      return NextResponse.json(
        { error },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        language: user.language,
      }
    });

  } catch (error) {
    console.error('Sign-in error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return createCorsResponse(request);
}