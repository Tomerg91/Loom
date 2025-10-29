import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

import { serverEnv } from '@/env/server';
import {
  createAuthenticatedSupabaseClient,
  propagateCookies,
} from '@/lib/api/auth-client';
import {
  createSuccessResponse,
  createErrorResponse,
  HTTP_STATUS,
} from '@/lib/api/utils';
import { createAdminClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/users/[id]/profile - Get user profile for client auth
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: userId } = await params;

    // Diagnostic logging: Check incoming request cookies
    const incomingCookies = request.cookies.getAll();
    console.log(
      '[PROFILE] GET /api/users/[id]/profile - Incoming cookies:',
      incomingCookies.map(c => c.name).join(', ') || '(none)'
    );

    // Use authenticated client helper for cookie handling
    const { client: supabase, response: authResponse } =
      createAuthenticatedSupabaseClient(request, new NextResponse());

    // Create client from Authorization bearer if provided; fallback to request/response client
    const authHeader = request.headers.get('authorization');
    console.log('[PROFILE] Authorization header present:', !!authHeader);
    const finalSupabase = authHeader
      ? createSupabaseClient<Database>(
          serverEnv.NEXT_PUBLIC_SUPABASE_URL!,
          serverEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { global: { headers: { Authorization: authHeader } } }
        )
      : supabase;

    // Get current session
    const {
      data: { session },
      error: sessionError,
    } = await finalSupabase.auth.getSession();

    console.log('[PROFILE] Session result:', {
      hasSession: !!session,
      error: sessionError?.message,
      sessionUser: session?.user?.email,
    });

    if (sessionError || !session) {
      const errorResponse = createErrorResponse(
        'Authentication required',
        HTTP_STATUS.UNAUTHORIZED
      );
      return propagateCookies(authResponse, errorResponse);
    }

    // Only allow users to fetch their own profile or admins to fetch any profile
    if (session.user.id !== userId) {
      // Check if current user is admin using admin client to bypass RLS
      const adminClient = createAdminClient();
      const { data: currentUserProfile } = await adminClient
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!currentUserProfile || currentUserProfile.role !== 'admin') {
        const errorResponse = createErrorResponse(
          'Access denied',
          HTTP_STATUS.FORBIDDEN
        );
        return propagateCookies(authResponse, errorResponse);
      }
    }

    // Fetch user profile using admin client to bypass RLS
    const adminClient = createAdminClient();
    const { data: user, error } = await adminClient
      .from('users')
      .select(
        'id, email, first_name, last_name, role, phone, avatar_url, timezone, language, status, created_at, updated_at, last_seen_at, onboarding_status, onboarding_step, onboarding_completed_at, onboarding_data, mfa_enabled, mfa_setup_completed, mfa_verified_at, remember_device_enabled'
      )
      .eq('id', userId)
      .single();

    if (error || !user) {
      const errorResponse = createErrorResponse(
        'User profile not found',
        HTTP_STATUS.NOT_FOUND
      );
      return propagateCookies(authResponse, errorResponse);
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
      onboardingStatus: user.onboarding_status || 'pending',
      onboardingStep: user.onboarding_step ?? 0,
      onboardingCompletedAt: user.onboarding_completed_at || undefined,
      onboardingData: user.onboarding_data || {},
      mfaEnabled: user.mfa_enabled ?? false,
      mfaSetupCompleted: user.mfa_setup_completed ?? false,
      mfaVerifiedAt: user.mfa_verified_at || undefined,
      rememberDeviceEnabled: user.remember_device_enabled ?? false,
    };

    const successResponse = createSuccessResponse(authUser);
    return propagateCookies(authResponse, successResponse);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    const errorResponse = createErrorResponse(
      'Internal server error',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
    // Note: authResponse may not be available if error occurs before creation
    return errorResponse;
  }
}
