import { NextRequest } from 'next/server';
import { authService } from '@/lib/services/auth-service';
import { ApiResponseHelper } from '@/lib/api/types';
import { ApiError } from '@/lib/api/errors';
import { createServerClient } from '@/lib/supabase/server';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  lastSession?: string;
  totalSessions: number;
  status: 'active' | 'inactive';
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

    // Get recent clients with session statistics
    const { data: sessionsWithClients, error } = await supabase
      .from('sessions')
      .select(`
        client_id,
        scheduled_at,
        status,
        users!sessions_client_id_fkey (
          id,
          first_name,
          last_name,
          email,
          avatar_url,
          status
        )
      `)
      .eq('coach_id', coachId)
      .order('scheduled_at', { ascending: false });

    if (error) {
      throw new ApiError('FETCH_CLIENTS_FAILED', 'Failed to fetch clients', 500);
    }

    // Process the data to get unique clients with statistics
    const clientMap = new Map<string, Client>();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    sessionsWithClients?.forEach(session => {
      const client = session.users;
      if (!client) return;

      const clientId = client.id;
      const sessionDate = new Date(session.scheduled_at);

      if (!clientMap.has(clientId)) {
        clientMap.set(clientId, {
          id: clientId,
          firstName: client.first_name || '',
          lastName: client.last_name || '',
          email: client.email,
          avatar: client.avatar_url || undefined,
          lastSession: sessionDate.toISOString(),
          totalSessions: 1,
          status: sessionDate >= thirtyDaysAgo ? 'active' : 'inactive',
        });
      } else {
        const existingClient = clientMap.get(clientId)!;
        existingClient.totalSessions++;
        
        // Update last session if this one is more recent
        if (!existingClient.lastSession || sessionDate > new Date(existingClient.lastSession)) {
          existingClient.lastSession = sessionDate.toISOString();
        }
        
        // Update status if any recent session exists
        if (sessionDate >= thirtyDaysAgo) {
          existingClient.status = 'active';
        }
      }
    });

    // Convert to array and sort by last session date
    const clients = Array.from(clientMap.values())
      .sort((a, b) => {
        const aDate = a.lastSession ? new Date(a.lastSession).getTime() : 0;
        const bDate = b.lastSession ? new Date(b.lastSession).getTime() : 0;
        return bDate - aDate;
      })
      .slice(0, limit);

    return ApiResponseHelper.success(clients);

  } catch (error) {
    console.error('Coach clients API error:', error);
    
    if (error instanceof ApiError) {
      return ApiResponseHelper.error(error.code, error.message, error.statusCode);
    }
    
    return ApiResponseHelper.internalError('Failed to fetch coach clients');
  }
}