import { NextRequest } from 'next/server';
import { authService } from '@/lib/services/auth-service';
import { ApiResponseHelper } from '@/lib/api/types';
import { ApiError } from '@/lib/api/errors';
import { createServerClient } from '@/lib/supabase/server';

interface RecentActivity {
  id: string;
  type: 'session_completed' | 'note_added' | 'client_joined' | 'session_scheduled';
  description: string;
  timestamp: string;
  clientName?: string;
}

export async function GET(request: NextRequest): Promise<Response> {
  try {
    // Verify authentication and get user
    const session = await authService.getSession();
    if (!session?.user || session.user.role !== 'coach') {
      return ApiResponseHelper.forbidden('Coach access required');
    }

    const coachId = session.user.id;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const supabase = createServerClient();

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
      const client = session.users;
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
      const client = session.users;
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

    // Get recent notes
    const { data: recentNotes } = await supabase
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

    recentNotes?.forEach(note => {
      const client = note.users;
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

    // Sort all activities by timestamp and limit
    const sortedActivities = activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    return ApiResponseHelper.success(sortedActivities);

  } catch (error) {
    console.error('Coach activity API error:', error);
    
    if (error instanceof ApiError) {
      return ApiResponseHelper.error(error.code, error.message);
    }
    
    return ApiResponseHelper.internalError('Failed to fetch coach activity');
  }
}