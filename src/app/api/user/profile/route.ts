import { NextRequest } from 'next/server';

import { ApiResponseHelper } from '@/lib/api/types';
import { authService } from '@/lib/services/auth-service';
import { createServerClient } from '@/lib/supabase/server';

/**
 * GET /api/user/profile
 *
 * Returns the current user's profile information including:
 * - Basic user data (id, email, name)
 * - Avatar URL
 * - Language preference
 *
 * Authentication required.
 *
 * Response is cached for 30 seconds to improve performance.
 */
export async function GET(_request: NextRequest): Promise<Response> {
  try {
    // Authenticate user
    const session = await authService.getSession();
    if (!session?.user) {
      return ApiResponseHelper.unauthorized('Authentication required');
    }

    const userId = session.user.id;

    // Fetch user profile from database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;

    const { data, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, avatar_url, language')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Profile fetch error:', error);
      return ApiResponseHelper.internalError('Failed to fetch profile');
    }

    if (!data) {
      return ApiResponseHelper.notFound('User profile not found');
    }

    // Transform snake_case to camelCase for API response
    const profile = {
      id: data.id,
      email: data.email,
      firstName: data.first_name,
      lastName: data.last_name,
      avatarUrl: data.avatar_url,
      language: data.language,
    };

    // Return response with cache headers
    const response = ApiResponseHelper.success(profile);
    response.headers.set('Cache-Control', 'public, max-age=30');

    return response;
  } catch (error) {
    console.error('Profile API error:', error);
    return ApiResponseHelper.internalError('An unexpected error occurred');
  }
}
