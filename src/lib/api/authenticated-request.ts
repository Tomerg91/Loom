import { NextRequest } from 'next/server';

import type { SessionUser } from '@/lib/services/auth-service';
import { createClient } from '@/modules/platform/supabase/server';

export interface AuthenticatedRequest {
  user: SessionUser;
  request: NextRequest;
}

/**
 * Extracts and validates the user from the request using the Authorization header.
 * This bypasses cookie-based authentication and uses token-based authentication instead.
 *
 * Expected header format: Authorization: Bearer <access_token>
 */
export async function getAuthenticatedUser(
  request: NextRequest
): Promise<SessionUser | null> {
  try {
    // Extract the Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.error('[AUTH] No Authorization header or invalid format');
      return null;
    }

    const accessToken = authHeader.slice(7); // Remove "Bearer " prefix
    if (!accessToken) {
      logger.error('[AUTH] Empty access token');
      return null;
    }

    // Create a Supabase client and validate the token
    const supabase = createClient();

    // Validate the access token with Supabase Auth
    const { data, error } = await supabase.auth.getUser(accessToken);

    if (error || !data.user) {
      logger.error('[AUTH] Failed to validate token:', error?.message);
      return null;
    }

    const supabaseUser = data.user;

    // Extract user information from the auth user object
    // The role is stored in user_metadata
    const role = supabaseUser.user_metadata?.role as 'admin' | 'coach' | 'client' | undefined;

    if (!role) {
      logger.error('[AUTH] User has no role in metadata');
      return null;
    }

    return {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      firstName: supabaseUser.user_metadata?.first_name,
      lastName: supabaseUser.user_metadata?.last_name,
      role,
      avatarUrl: supabaseUser.user_metadata?.avatar_url,
      createdAt: supabaseUser.created_at || new Date().toISOString(),
    };
  } catch (error) {
    logger.error('[AUTH] Error getting authenticated user:', error);
    return null;
  }
}

/**
 * Validates that the authenticated user has the required role.
 */
export function validateUserRole(
  user: SessionUser | null,
  requiredRole?: SessionUser['role']
): boolean {
  if (!user) {
    return false;
  }

  if (requiredRole && user.role !== requiredRole) {
    return false;
  }

  return true;
}
