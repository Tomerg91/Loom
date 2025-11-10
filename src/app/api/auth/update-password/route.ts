import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAuthService } from '@/lib/auth/auth';
import { createCorsResponse } from '@/lib/security/cors';

const updatePasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  token: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = updatePasswordSchema.safeParse(body);
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
    
    // Handle token-based password reset vs authenticated password update
    if (validation.data.token) {
      // Token-based password reset
      const { error } = await authService.updatePasswordWithToken(
        validation.data.token, 
        validation.data.password
      );
      
      if (error) {
        return NextResponse.json(
          { error },
          { status: 400 }
        );
      }
    } else {
      // Authenticated password update
      const user = await authService.getCurrentUser();
      if (!user) {
        return NextResponse.json(
          { error: 'Not authenticated' },
          { status: 401 }
        );
      }

      const { error } = await authService.updatePassword(validation.data.password);
      
      if (error) {
        return NextResponse.json(
          { error },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('Update password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return createCorsResponse(request);
}