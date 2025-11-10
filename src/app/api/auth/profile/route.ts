import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAuthService } from '@/lib/auth/auth';
import { createCorsResponse } from '@/lib/security/cors';

const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
  location: z.string().optional(),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  avatarUrl: z.string().url('Invalid avatar URL').optional().or(z.literal('')),
  language: z.enum(['en', 'he']).optional(),
  specialties: z.array(z.string()).optional(),
});

export async function GET() {
  try {
    const authService = createAuthService(true);
    const user = await authService.getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
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
    console.error('Get profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = updateProfileSchema.safeParse(body);
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
    
    // Check if user is authenticated
    const currentUser = await authService.getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { user, error } = await authService.updateProfile(validation.data);

    if (error) {
      return NextResponse.json(
        { error },
        { status: 400 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Failed to update profile' },
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
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return createCorsResponse(request);
}