import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { env } from '@/env';
import { createSuccessResponse, createErrorResponse, HTTP_STATUS } from '@/lib/api/utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/users/[id]/profile - Get user profile for client auth
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: userId } = await params;
    
    // Create client from Authorization bearer if provided; fallback to cookie-based server client
    const authHeader = request.headers.get('authorization');
    const supabase = authHeader
      ? createSupabaseClient<Database>(
          env.server.NEXT_PUBLIC_SUPABASE_URL!,
          env.server.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { global: { headers: { Authorization: authHeader } } }
        )
      : createServerClient();
    
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return createErrorResponse('Authentication required', HTTP_STATUS.UNAUTHORIZED);
    }

    // Only allow users to fetch their own profile or admins to fetch any profile
    if (session.user.id !== userId) {
      // Check if current user is admin
      const { data: currentUserProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();
      
      if (!currentUserProfile || currentUserProfile.role !== 'admin') {
        return createErrorResponse('Access denied', HTTP_STATUS.FORBIDDEN);
      }
    }

    // Fetch user profile
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, phone, avatar_url, timezone, language, status, created_at, updated_at, last_seen_at, mfa_enabled, mfa_setup_completed, mfa_verified_at, remember_device_enabled')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return createErrorResponse('User profile not found', HTTP_STATUS.NOT_FOUND);
    }

    // Transform to AuthUser format
    const authUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      phone: user.phone || '',
      avatarUrl: user.avatar_url || '',
      timezone: user.timezone || 'UTC',
      language: user.language,
      status: user.status,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      lastSeenAt: user.last_seen_at || undefined,
      mfaEnabled: user.mfa_enabled,
      mfaSetupCompleted: user.mfa_setup_completed,
      mfaVerifiedAt: user.mfa_verified_at,
      rememberDeviceEnabled: user.remember_device_enabled,
    };

    return createSuccessResponse(authUser);
    
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return createErrorResponse(
      'Internal server error', 
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}
