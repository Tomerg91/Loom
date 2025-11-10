import { NextRequest } from 'next/server';

import { getAuthenticatedUser } from '@/lib/api/authenticated-request';
import { ApiError } from '@/lib/api/errors';
import { ApiResponseHelper } from '@/lib/api/types';
import { createClient } from '@/lib/supabase/server';

interface RecentActivity {
  id: string;
  type: 'session_completed' | 'note_added' | 'client_joined' | 'session_scheduled';
  description: string;
  timestamp: string;
  clientName?: string;
}

export async function GET(request: NextRequest): Promise<Response> {
  try {
    // Verify authentication and get user from Authorization header
    const user = await getAuthenticatedUser(request);

    console.log('[/api/coach/activity] Auth check:', {
      hasUser: !!user,
      userId: user?.id,
      userRole: user?.role,
      timestamp: new Date().toISOString()
    });

    if (!user) {
      console.error('[/api/coach/activity] No user found');
      return ApiResponseHelper.unauthorized('Authentication required');
    }

    if (user.role !== 'coach') {
      console.error('[/api/coach/activity] User is not a coach:', {
        userId: user.id,
        role: user.role
      });
      return ApiResponseHelper.forbidden(`Coach access required. Current role: ${user.role}`);
    }

    const coachId = user.id;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    console.log('[/api/coach/activity] Fetching activity for coach:', coachId);

    const supabase = createClient();

    // Fetch recent activities from different sources
    const activities: RecentActivity[] = [];

    // Get recent completed sessions
    const { data: completedSessions } = await supabase
      .from('sessions')
      .select(`
        id,
        updated_at,
        status,
        users!sessions_client_id_fkey (
          first_name,
          last_name
        )
      `)
      .eq('coach_id', coachId)
      .eq('status', 'completed')
      .order('updated_at', { ascending: false })
      .limit(5);

    completedSessions?.forEach(session => {
      const client = Array.isArray(session.users) ? session.users[0] : session.users;
      if (client) {
        activities.push({
          id: `session_completed_${session.id}`,
          type: 'session_completed',
          description: `Completed session with ${client.first_name} ${client.last_name}`,
          timestamp: session.updated_at,
          clientName: `${client.first_name} ${client.last_name}`,
        });
      }
    });

    // Get recent scheduled sessions
    const { data: scheduledSessions } = await supabase
      .from('sessions')
      .select(`
        id,
        created_at,
        status,
        users!sessions_client_id_fkey (
          first_name,
          last_name
        )
      `)
      .eq('coach_id', coachId)
      .eq('status', 'scheduled')
      .order('created_at', { ascending: false })
      .limit(5);

    scheduledSessions?.forEach(session => {
      const client = Array.isArray(session.users) ? session.users[0] : session.users;
      if (client) {
        activities.push({
          id: `session_scheduled_${session.id}`,
          type: 'session_scheduled',
          description: `New session scheduled with ${client.first_name} ${client.last_name}`,
          timestamp: session.created_at,
          clientName: `${client.first_name} ${client.last_name}`,
        });
      }
    });

    // Get recent notes (gracefully handle if table doesn't exist)
    const { data: recentNotes, error: notesError } = await supabase
      .from('coach_notes')
      .select(`
        id,
        created_at,
        title,
        users!coach_notes_client_id_fkey (
          first_name,
          last_name
        )
      `)
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (notesError) {
      console.warn('[/api/coach/activity] Error fetching notes (may not exist):', notesError.message);
    } else {
      recentNotes?.forEach(note => {
        const client = Array.isArray(note.users) ? note.users[0] : note.users;
        if (client) {
          activities.push({
            id: `note_added_${note.id}`,
            type: 'note_added',
            description: `Added progress note for ${client.first_name} ${client.last_name}`,
            timestamp: note.created_at,
            clientName: `${client.first_name} ${client.last_name}`,
          });
        }
      });
    }

    // Sort all activities by timestamp and limit
    const sortedActivities = activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    console.log('[/api/coach/activity] Returning activities:', {
      count: sortedActivities.length,
      types: sortedActivities.map(a => a.type)
    });

    return ApiResponseHelper.success(sortedActivities);

  } catch (error) {
    console.error('Coach activity API error:', error);
    
    if (error instanceof ApiError) {
      return ApiResponseHelper.error(error.code, error.message);
    }
    
    return ApiResponseHelper.internalError('Failed to fetch coach activity');
  }
}