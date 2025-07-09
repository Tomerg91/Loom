import { NextRequest, NextResponse } from 'next/server';
import { createAuthService } from '@/lib/auth/auth';
import { strongPasswordSchema } from '@/lib/security/password';
import { z } from 'zod';

const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: strongPasswordSchema,
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['client', 'coach', 'admin'], {
    errorMap: () => ({ message: 'Role must be client, coach, or admin' })
  }),
  phone: z.string().optional(),
  language: z.enum(['en', 'he'], {
    errorMap: () => ({ message: 'Language must be en or he' })
  }).default('en'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = signUpSchema.safeParse(body);
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
    const { user, error } = await authService.signUp(validation.data);

    if (error) {
      return NextResponse.json(
        { error },
        { status: 400 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 400 }
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
      },
      message: 'User account created successfully. Please check your email for verification.'
    }, { status: 201 });

  } catch (error) {
    console.error('Sign-up error:', error);
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