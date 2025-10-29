import { NextRequest } from 'next/server';

import { getAuthenticatedUser } from '@/lib/api/authenticated-request';
import { ApiResponseHelper } from '@/lib/api/types';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/users/[id]/last-seen - Update user's last seen timestamp
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: userId } = await params;

    // Get authenticated user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return ApiResponseHelper.unauthorized('Authentication required');
    }

    // Only allow users to update their own last seen timestamp
    if (user.id !== userId) {
      return ApiResponseHelper.forbidden('Access denied');
    }

    // Update last seen timestamp
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from('users')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating last seen:', updateError);
      return ApiResponseHelper.internalError('Failed to update last seen timestamp');
    }

    return ApiResponseHelper.success(null, 'Last seen timestamp updated successfully');
  } catch (error) {
    console.error('Error updating last seen:', error);
    return ApiResponseHelper.internalError('Failed to update last seen timestamp');
  }
}
