import { NextRequest } from 'next/server';

import { ApiError } from '@/lib/api/errors';
import { ApiResponseHelper } from '@/lib/api/types';
import { createClient } from '@/lib/supabase/server';
import { queryMonitor } from '@/lib/performance/query-monitoring';

interface RecentActivity {
  id: string;
  type: 'session_completed' | 'note_added' | 'client_joined' | 'session_scheduled';
  description: string;
  timestamp: string;
  clientName?: string;
}

export async function GET(request: NextRequest): Promise<Response> {
  try {
    // Use cookie-based authentication (same as sessions endpoint)
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    console.log('[/api/coach/activity] Auth check:', {
      hasUser: !!user,
      userId: user?.id,
      authError: authError?.message,
      timestamp: new Date().toISOString()
    });

    if (authError || !user) {
      console.error('[/api/coach/activity] Authentication failed:', authError);
      return ApiResponseHelper.unauthorized('Authentication required');
    }

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('[/api/coach/activity] Failed to fetch user profile:', profileError);
      return ApiResponseHelper.unauthorized('User profile not found');
    }

    if (profile.role !== 'coach') {
      console.error('[/api/coach/activity] User is not a coach:', {
        userId: user.id,
        role: profile.role
      });
      return ApiResponseHelper.forbidden(`Coach access required. Current role: ${profile.role}`);
    }

    const coachId = user.id;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    console.log('[/api/coach/activity] Fetching activity for coach:', coachId);

    // Use the optimized RPC function for recent activity
    const { data: activityData, error } = await queryMonitor.trackQueryExecution(
      'Coach Recent Activity RPC',
      async () => {
        return await supabase.rpc('get_coach_recent_activity', {
          p_coach_id: coachId,
          p_limit: limit,
        });
      }
    );

    if (error) {
      console.error('[/api/coach/activity] Error fetching activity:', error);
      throw new ApiError('FETCH_ACTIVITY_FAILED', 'Failed to fetch coach activity', 500);
    }

    // Transform RPC result to match the expected interface
    const activities: RecentActivity[] = (activityData || []).map((row: any) => ({
      id: row.activity_id,
      type: row.activity_type as 'session_completed' | 'note_added' | 'client_joined' | 'session_scheduled',
      description: row.description,
      timestamp: row.timestamp,
      clientName: row.client_name || undefined,
    }));

    console.log('[/api/coach/activity] Returning activities:', {
      count: activities.length,
      types: activities.map(a => a.type)
    });

    return ApiResponseHelper.success(activities);

  } catch (error) {
    console.error('Coach activity API error:', error);

    if (error instanceof ApiError) {
      return ApiResponseHelper.error(error.code, error.message);
    }

    return ApiResponseHelper.internalError('Failed to fetch coach activity');
  }
}