import { NextRequest } from 'next/server';

import { ApiError } from '@/lib/api/errors';
import { ApiResponseHelper } from '@/lib/api/types';
import { authService } from '@/lib/services/auth-service';
import { createClient } from '@/lib/supabase/server';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  lastSession?: string;
  totalSessions: number;
  status: 'active' | 'inactive' | 'pending';
  joinedDate: string;
  nextSession?: string;
  completedSessions: number;
  averageRating: number;
  goals?: string[];
  progress: {
    current: number;
    target: number;
  };
}

function deriveClientStatus(
  userStatus: string | null | undefined,
  sessionDate: Date,
  activeThreshold: Date,
  sessionStatus?: string | null
): 'active' | 'inactive' | 'pending' {
  const normalizedUser = userStatus?.toLowerCase();
  const normalizedSession = sessionStatus?.toLowerCase();

  if (normalizedUser && (normalizedUser === 'pending' || normalizedUser === 'invited')) {
    return 'pending';
  }

  if (normalizedSession === 'cancelled') {
    return sessionDate >= activeThreshold && normalizedUser === 'active' ? 'active' : 'inactive';
  }

  if (sessionDate >= activeThreshold) {
    return 'active';
  }

  return 'inactive';
}

export async function GET(request: NextRequest): Promise<Response> {
  try {
    // Verify authentication and get user
    const session = await authService.getSession();

    console.log('[/api/coach/clients] Auth check:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      userRole: session?.user?.role,
      timestamp: new Date().toISOString()
    });

    if (!session?.user) {
      console.error('[/api/coach/clients] No session or user found');
      return ApiResponseHelper.unauthorized('Authentication required');
    }

    if (session.user.role !== 'coach') {
      console.error('[/api/coach/clients] User is not a coach:', {
        userId: session.user.id,
        role: session.user.role
      });
      return ApiResponseHelper.forbidden(`Coach access required. Current role: ${session.user.role}`);
    }

    const coachId = session.user.id;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const search = searchParams.get('search') || '';
    const statusFilter = searchParams.get('status') || 'all';
    const sortBy = searchParams.get('sortBy') || 'name';

    const supabase = createClient();

    console.log('[/api/coach/clients] Fetching clients for coach:', coachId);

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
          phone,
          avatar_url,
          status,
          created_at
        )
      `)
      .eq('coach_id', coachId)
      .order('scheduled_at', { ascending: false });

    if (error) {
      console.error('[/api/coach/clients] Error fetching sessions:', error);
      throw new ApiError('FETCH_CLIENTS_FAILED', 'Failed to fetch clients', 500);
    }

    console.log('[/api/coach/clients] Sessions query result:', {
      count: sessionsWithClients?.length || 0,
      hasData: !!sessionsWithClients
    });

    // Process the data to get unique clients with statistics
    const clientMap = new Map<string, Client>();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const session of sessionsWithClients || []) {
      const client = Array.isArray(session.users) ? session.users[0] : session.users;
      if (!client) continue;

      const clientId = client.id;
      const sessionDate = new Date(session.scheduled_at);

      if (!clientMap.has(clientId)) {
        clientMap.set(clientId, {
          id: clientId,
          firstName: client.first_name || '',
          lastName: client.last_name || '',
          email: client.email,
          phone: client.phone || undefined,
          avatar: client.avatar_url || undefined,
          lastSession: session.status === 'completed' ? sessionDate.toISOString() : undefined,
          totalSessions: 1,
          status: deriveClientStatus(client.status, sessionDate, thirtyDaysAgo, session.status),
          joinedDate: client.created_at,
          nextSession: session.status === 'scheduled' && sessionDate > new Date() ? sessionDate.toISOString() : undefined,
          completedSessions: session.status === 'completed' ? 1 : 0,
          averageRating: 0, // Will be calculated later
          goals: [],
          progress: {
            current: session.status === 'completed' ? 1 : 0,
            target: 1,
          },
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
        if (session.status !== 'cancelled' && sessionDate >= thirtyDaysAgo && existingClient.status !== 'pending') {
          existingClient.status = 'active';
        }
      }
    }

    const clientIds = Array.from(clientMap.keys());

    if (clientIds.length > 0) {
      const [feedbackResult, ratingsResult, goalsResult] = await Promise.all([
        supabase
          .from('session_feedback')
          .select('client_id, overall_rating')
          .eq('coach_id', coachId)
          .in('client_id', clientIds),
        supabase
          .from('session_ratings')
          .select('client_id, rating')
          .eq('coach_id', coachId)
          .in('client_id', clientIds),
        supabase
          .from('client_goals')
          .select('client_id, title, status, progress_percentage, target_date')
          .eq('coach_id', coachId)
          .in('client_id', clientIds)
          .order('created_at', { ascending: false }),
      ]);

      if (feedbackResult.error) {
        console.warn('[/api/coach/clients] Failed to load session feedback', feedbackResult.error);
      }
      if (ratingsResult.error) {
        console.warn('[/api/coach/clients] Failed to load session ratings', ratingsResult.error);
      }
      if (goalsResult.error) {
        console.warn('[/api/coach/clients] Failed to load client goals', goalsResult.error);
      }

      const ratingMap = new Map<string, number[]>();

      feedbackResult.data?.forEach((feedback) => {
        if (feedback.overall_rating == null) return;
        const value = Number(feedback.overall_rating);
        if (!Number.isFinite(value) || value <= 0) return;
        if (!ratingMap.has(feedback.client_id)) {
          ratingMap.set(feedback.client_id, []);
        }
        ratingMap.get(feedback.client_id)!.push(value);
      });

      ratingsResult.data?.forEach((rating) => {
        if (rating.rating == null) return;
        const value = Number(rating.rating);
        if (!Number.isFinite(value) || value <= 0) return;
        if (!ratingMap.has(rating.client_id)) {
          ratingMap.set(rating.client_id, []);
        }
        ratingMap.get(rating.client_id)!.push(value);
      });

      const goalsByClient = new Map<string, string[]>();
      goalsResult.data?.forEach((goal) => {
        if (!goalsByClient.has(goal.client_id)) {
          goalsByClient.set(goal.client_id, []);
        }

        const goalLabelParts = [goal.title.trim()];
        if (goal.status && goal.status !== 'active') {
          goalLabelParts.push(`(${goal.status})`);
        }
        if (goal.progress_percentage != null) {
          goalLabelParts.push(`${goal.progress_percentage}%`);
        }
        goalsByClient.get(goal.client_id)!.push(goalLabelParts.filter(Boolean).join(' '));
      });

      for (const [clientId, client] of clientMap.entries()) {
        const ratings = ratingMap.get(clientId);
        if (ratings && ratings.length > 0) {
          const sum = ratings.reduce((total, value) => total + value, 0);
          client.averageRating = Math.round(((sum / ratings.length) + Number.EPSILON) * 10) / 10;
        }

        client.goals = goalsByClient.get(clientId)?.slice(0, 3) ?? [];
        client.progress = {
          current: client.completedSessions,
          target: Math.max(client.totalSessions, 1),
        };
      }
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

    console.log('[/api/coach/clients] Returning clients:', {
      count: clients.length,
      clientIds: clients.map(c => c.id)
    });

    return ApiResponseHelper.success(clients);

  } catch (error) {
    console.error('Coach clients API error:', error);
    
    if (error instanceof ApiError) {
      return ApiResponseHelper.error(error.code, error.message, error.statusCode);
    }
    
    return ApiResponseHelper.internalError('Failed to fetch coach clients');
  }
}