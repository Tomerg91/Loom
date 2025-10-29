import { NextRequest } from 'next/server';

import { getAuthenticatedUser } from '@/lib/api/authenticated-request';
import { ApiResponseHelper } from '@/lib/api/types';
import { createAdminClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/users/[id]/profile - Get user profile for client auth
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: userId } = await params;

    // Get authenticated user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return ApiResponseHelper.unauthorized('Authentication required');
    }

    // Only allow users to fetch their own profile or admins to fetch any profile
    if (user.id !== userId) {
      // Check if current user is admin using admin client to bypass RLS
      const adminClient = createAdminClient();
      const { data: currentUserProfile } = await adminClient
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!currentUserProfile || currentUserProfile.role !== 'admin') {
        return ApiResponseHelper.forbidden('Access denied');
      }
    }

    // Fetch user profile using admin client to bypass RLS
    const adminClient = createAdminClient();
    const { data: userData, error } = await adminClient
      .from('users')
      .select(
        'id, email, first_name, last_name, role, phone, avatar_url, timezone, language, status, created_at, updated_at, last_seen_at, onboarding_status, onboarding_step, onboarding_completed_at, onboarding_data, mfa_enabled, mfa_setup_completed, mfa_verified_at, remember_device_enabled'
      )
      .eq('id', userId)
      .single();

    if (error || !userData) {
      return ApiResponseHelper.notFound('User profile not found');
    }

    // Transform to AuthUser format
    const authUser = {
      id: userData.id,
      email: userData.email,
      role: userData.role,
      firstName: userData.first_name || '',
      lastName: userData.last_name || '',
      phone: userData.phone || '',
      avatarUrl: userData.avatar_url || '',
      timezone: userData.timezone || 'UTC',
      language: userData.language,
      status: userData.status,
      createdAt: userData.created_at,
      updatedAt: userData.updated_at,
      lastSeenAt: userData.last_seen_at || undefined,
      onboardingStatus: userData.onboarding_status || 'pending',
      onboardingStep: userData.onboarding_step ?? 0,
      onboardingCompletedAt: userData.onboarding_completed_at || undefined,
      onboardingData: userData.onboarding_data || {},
      mfaEnabled: userData.mfa_enabled ?? false,
      mfaSetupCompleted: userData.mfa_setup_completed ?? false,
      mfaVerifiedAt: userData.mfa_verified_at || undefined,
      rememberDeviceEnabled: userData.remember_device_enabled ?? false,
    };

    return ApiResponseHelper.success(authUser);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return ApiResponseHelper.internalError('Failed to fetch user profile');
  }
}
