import { NextRequest, NextResponse } from 'next/server';

import {
  createSuccessResponse,
  createErrorResponse,
  HTTP_STATUS,
} from '@/lib/api/utils';
import {
  createAuthenticatedSupabaseClient,
  propagateCookies,
} from '@/lib/api/auth-client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/users/[id]/last-seen - Update user's last seen timestamp
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: userId } = await params;

    const { client: supabase, response: authResponse } =
      createAuthenticatedSupabaseClient(request, new NextResponse());

    // Get current session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return propagateCookies(
        authResponse,
        createErrorResponse('Authentication required', HTTP_STATUS.UNAUTHORIZED)
      );
    }

    // Only allow users to update their own last seen timestamp
    if (session.user.id !== userId) {
      return propagateCookies(
        authResponse,
        createErrorResponse('Access denied', HTTP_STATUS.FORBIDDEN)
      );
    }

    // Update last seen timestamp
    const { error: updateError } = await supabase
      .from('users')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating last seen:', updateError);
      return propagateCookies(
        authResponse,
        createErrorResponse(
          'Failed to update last seen timestamp',
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        )
      );
    }

    return propagateCookies(
      authResponse,
      createSuccessResponse(null, 'Last seen timestamp updated successfully')
    );
  } catch (error) {
    console.error('Error updating last seen:', error);
    return createErrorResponse(
      'Internal server error',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}
