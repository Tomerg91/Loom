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
  joinedDate: string;
  nextSession?: string;
  completedSessions: number;
  averageRating: number;
  goals?: string[];
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
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const search = searchParams.get('search') || '';
    const statusFilter = searchParams.get('status') || 'all';
    const sortBy = searchParams.get('sortBy') || 'name';

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
          status,
          created_at
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

    for (const session of sessionsWithClients || []) {
      const client = session.users;
      if (!client) continue;

      const clientId = client.id;
      const sessionDate = new Date(session.scheduled_at);

      if (!clientMap.has(clientId)) {
        clientMap.set(clientId, {
          id: clientId,
          firstName: client.first_name || '',
          lastName: client.last_name || '',
          email: client.email,
          avatar: client.avatar_url || undefined,
          lastSession: session.status === 'completed' ? sessionDate.toISOString() : undefined,
          totalSessions: 1,
          status: sessionDate >= thirtyDaysAgo ? 'active' : 'inactive',
          joinedDate: client.created_at,
          nextSession: session.status === 'scheduled' && sessionDate > new Date() ? sessionDate.toISOString() : undefined,
          completedSessions: session.status === 'completed' ? 1 : 0,
          averageRating: 0, // Will be calculated later
          goals: [], // Will be fetched later
        });
      } else {
        const existingClient = clientMap.get(clientId)!;
        existingClient.totalSessions++;
        if (session.status === 'completed') {
          existingClient.completedSessions++;
          if (!existingClient.lastSession || sessionDate > new Date(existingClient.lastSession)) {
            existingClient.lastSession = sessionDate.toISOString();
          }
        }
        if (session.status === 'scheduled' && sessionDate > new Date()) {
          if (!existingClient.nextSession || sessionDate < new Date(existingClient.nextSession)) {
            existingClient.nextSession = sessionDate.toISOString();
          }
        }
        if (sessionDate >= thirtyDaysAgo) {
          existingClient.status = 'active';
        }
      }
    }

    // Fetch average ratings
    const clientIds = Array.from(clientMap.keys());
    const { data: ratings } = await supabase
      .from('reflections')
      .select('client_id, mood_rating')
      .in('client_id', clientIds);

    const clientRatings = new Map<string, number[]>();
    for (const rating of ratings || []) {
      if (!clientRatings.has(rating.client_id)) {
        clientRatings.set(rating.client_id, []);
      }
      clientRatings.get(rating.client_id)!.push(rating.mood_rating);
    }

    for (const [clientId, client] of clientMap.entries()) {
      const ratings = clientRatings.get(clientId);
      if (ratings && ratings.length > 0) {
        client.averageRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      }
    }

    // Fetch goals (to be implemented)
    for (const client of clientMap.values()) {
      client.goals = []; // TODO: Fetch goals from the database
    }

    // Convert to array and apply filtering
    let clients = Array.from(clientMap.values());
    
    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      clients = clients.filter(client =>
        `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchLower) ||
        client.email.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      clients = clients.filter(client => client.status === statusFilter);
    }
    
    // Apply sorting
    clients.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        case 'joinedDate':
          // Use first session date as proxy for joined date since we don't have exact join date
          const aFirstSession = a.lastSession ? new Date(a.lastSession).getTime() : 0;
          const bFirstSession = b.lastSession ? new Date(b.lastSession).getTime() : 0;
          return bFirstSession - aFirstSession;
        case 'lastSession':
          const aDate = a.lastSession ? new Date(a.lastSession).getTime() : 0;
          const bDate = b.lastSession ? new Date(b.lastSession).getTime() : 0;
          return bDate - aDate;
        case 'progress':
          return b.totalSessions - a.totalSessions; // Use session count as progress proxy
        default:
          const aLastDate = a.lastSession ? new Date(a.lastSession).getTime() : 0;
          const bLastDate = b.lastSession ? new Date(b.lastSession).getTime() : 0;
          return bLastDate - aLastDate;
      }
    });
    
    // Apply limit
    clients = clients.slice(0, limit);

    return ApiResponseHelper.success(clients);

  } catch (error) {
    console.error('Coach clients API error:', error);
    
    if (error instanceof ApiError) {
      return ApiResponseHelper.error(error.code, error.message, error.statusCode);
    }
    
    return ApiResponseHelper.internalError('Failed to fetch coach clients');
  }
}