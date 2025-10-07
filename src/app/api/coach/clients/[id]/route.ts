import { NextRequest } from 'next/server';

import { ApiError } from '@/lib/api/errors';
import { ApiResponseHelper } from '@/lib/api/types';
import { authService } from '@/lib/services/auth-service';
import { createClient } from '@/lib/supabase/server';

interface ClientDetailResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  status: 'active' | 'inactive' | 'pending';
  joinedDate: string;
  totalSessions: number;
  completedSessions: number;
  averageRating: number;
  goals: string[];
  notes: string;
  progress: {
    current: number;
    target: number;
  };
  sessions: SessionDetail[];
}

interface SessionDetail {
  id: string;
  date: string;
  duration: number;
  status: 'completed' | 'scheduled' | 'cancelled';
  rating?: number;
  notes?: string;
  type: 'video' | 'in-person' | 'phone';
  title?: string;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    // Verify authentication and get user
    const session = await authService.getSession();
    if (!session?.user || session.user.role !== 'coach') {
      return ApiResponseHelper.forbidden('Coach access required');
    }

    const params = await context.params;
    const coachId = session.user.id;
    const clientId = params.id;

    if (!clientId) {
      return ApiResponseHelper.badRequest('Client ID is required');
    }

    const supabase = createClient();

    // Get client details
    const { data: clientUser, error: clientError } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        avatar_url,
        status,
        created_at
      `)
      .eq('id', clientId)
      .eq('role', 'client')
      .single();

    if (clientError || !clientUser) {
      return ApiResponseHelper.notFound('Client not found');
    }

    // Verify this client has sessions with the current coach
    const { data: coachClientRelation, error: relationError } = await supabase
      .from('sessions')
      .select('id')
      .eq('coach_id', coachId)
      .eq('client_id', clientId)
      .limit(1);

    if (relationError || !coachClientRelation || coachClientRelation.length === 0) {
      return ApiResponseHelper.forbidden('You do not have access to this client');
    }

    // Get all sessions for this client with this coach
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select(`
        id,
        title,
        description,
        scheduled_at,
        duration_minutes,
        status,
        meeting_url,
        created_at
      `)
      .eq('coach_id', coachId)
      .eq('client_id', clientId)
      .order('scheduled_at', { ascending: false });

    if (sessionsError) {
      throw new ApiError('FETCH_SESSIONS_FAILED', 'Failed to fetch client sessions', 500);
    }

    const sessionIds = sessions?.map((session) => session.id) ?? [];

    // Get client notes from this coach
    const { data: notes, error: notesError } = await supabase
      .from('coach_notes')
      .select('content')
      .eq('coach_id', coachId)
      .eq('client_id', clientId)
      .eq('privacy_level', 'private')
      .order('created_at', { ascending: false })
      .limit(1);

    if (notesError) {
      console.warn('[/api/coach/clients/:id] Failed to load coach notes', notesError);
    }

    const feedbackPromise = sessionIds.length > 0
      ? supabase
          .from('session_feedback')
          .select('session_id, overall_rating')
          .eq('coach_id', coachId)
          .in('session_id', sessionIds)
      : Promise.resolve<{ data: { session_id: string; overall_rating: number | null }[]; error: null }>({
          data: [],
          error: null,
        });

    const ratingsPromise = sessionIds.length > 0
      ? supabase
          .from('session_ratings')
          .select('session_id, rating')
          .eq('coach_id', coachId)
          .in('session_id', sessionIds)
      : Promise.resolve<{ data: { session_id: string; rating: number | null }[]; error: null }>({
          data: [],
          error: null,
        });

    const goalsPromise = supabase
      .from('client_goals')
      .select('id, title, status, progress_percentage, target_date, completed_at')
      .eq('coach_id', coachId)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    const [feedbackResult, ratingsResult, goalsResult] = await Promise.all([
      feedbackPromise,
      ratingsPromise,
      goalsPromise,
    ]);

    if (feedbackResult.error) {
      console.warn('[/api/coach/clients/:id] Failed to load session feedback', feedbackResult.error);
    }
    if (ratingsResult.error) {
      console.warn('[/api/coach/clients/:id] Failed to load session ratings', ratingsResult.error);
    }
    if (goalsResult.error) {
      console.warn('[/api/coach/clients/:id] Failed to load client goals', goalsResult.error);
    }

    const totalSessions = sessions?.length || 0;
    const completedSessions = sessions?.filter((s) => s.status === 'completed').length || 0;

    const ratingBySession = new Map<string, number>();

    feedbackResult.data
      ?.filter((feedback) => feedback.overall_rating != null)
      .forEach((feedback) => {
        const parsed = Number(feedback.overall_rating);
        if (Number.isFinite(parsed) && parsed > 0) {
          ratingBySession.set(feedback.session_id, parsed);
        }
      });

    ratingsResult.data
      ?.filter((rating) => rating.rating != null)
      .forEach((rating) => {
        const parsed = Number(rating.rating);
        if (!ratingBySession.has(rating.session_id) && Number.isFinite(parsed) && parsed > 0) {
          ratingBySession.set(rating.session_id, parsed);
        }
      });

    const ratingValues = Array.from(ratingBySession.values());
    const averageRating = ratingValues.length > 0
      ? Math.round(((ratingValues.reduce((sum, value) => sum + value, 0) / ratingValues.length) + Number.EPSILON) * 10) / 10
      : 0;

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const hasRecentSession = sessions?.some((session) => {
      if (session.status === 'cancelled') return false;
      const scheduledAt = new Date(session.scheduled_at);
      return scheduledAt >= thirtyDaysAgo;
    }) ?? false;

    const normalizedUserStatus = clientUser.status?.toLowerCase();
    const clientStatus: 'active' | 'inactive' | 'pending' = normalizedUserStatus && (normalizedUserStatus === 'pending' || normalizedUserStatus === 'invited')
      ? 'pending'
      : hasRecentSession
        ? 'active'
        : 'inactive';

    const goals = goalsResult.data ?? [];
    const activeGoals = goals.filter((goal) => goal.status !== 'completed' && goal.status !== 'cancelled');
    const goalProgressAverage = activeGoals.length > 0
      ? Math.round(
          (activeGoals.reduce((sum, goal) => sum + (goal.progress_percentage ?? 0), 0) / activeGoals.length)
        )
      : null;

    const progressPercentage = goalProgressAverage ?? (totalSessions > 0
      ? Math.round((completedSessions / totalSessions) * 100)
      : 0);
    const normalizedProgress = Math.max(0, Math.min(100, progressPercentage));

    const goalSummaries = goals.map((goal) => {
      const parts = [goal.title?.trim()].filter(Boolean) as string[];
      if (goal.progress_percentage != null) {
        parts.push(`${goal.progress_percentage}%`);
      }
      if (goal.status) {
        parts.push(goal.status);
      }
      if (goal.target_date) {
        parts.push(`due ${goal.target_date}`);
      }
      return parts.join(' • ');
    });

    const sessionDetails: SessionDetail[] = sessions?.map((session) => {
      const rating = ratingBySession.get(session.id);
      return {
        id: session.id,
        date: session.scheduled_at,
        duration: session.duration_minutes || 60,
        status: session.status as 'completed' | 'scheduled' | 'cancelled',
        rating: rating ?? undefined,
        notes: session.description || undefined,
        type: 'video',
        title: session.title || undefined,
      };
    }) || [];

    const clientDetail: ClientDetailResponse = {
      id: clientUser.id,
      firstName: clientUser.first_name || '',
      lastName: clientUser.last_name || '',
      email: clientUser.email,
      phone: clientUser.phone || undefined,
      avatar: clientUser.avatar_url || undefined,
      status: clientStatus,
      joinedDate: clientUser.created_at,
      totalSessions,
      completedSessions,
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      goals: goalSummaries.slice(0, 5),
      notes: notes?.[0]?.content || '',
      progress: {
        current: normalizedProgress,
        target: 100,
      },
      sessions: sessionDetails,
    };

    return ApiResponseHelper.success(clientDetail);

  } catch (error) {
    console.error('Client detail API error:', error);
    
    if (error instanceof ApiError) {
      return ApiResponseHelper.error(error.code, error.message, error.statusCode);
    }
    
    return ApiResponseHelper.internalError('Failed to fetch client details');
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    // Verify authentication and get user
    const session = await authService.getSession();
    if (!session?.user || session.user.role !== 'coach') {
      return ApiResponseHelper.forbidden('Coach access required');
    }

    const params = await context.params;
    const coachId = session.user.id;
    const clientId = params.id;

    if (!clientId) {
      return ApiResponseHelper.badRequest('Client ID is required');
    }

    const body = await request.json();
    const { notes } = body;

    if (typeof notes !== 'string') {
      return ApiResponseHelper.badRequest('Notes must be a string');
    }

    const supabase = createClient();

    // Verify this client has sessions with the current coach
    const { data: coachClientRelation, error: relationError } = await supabase
      .from('sessions')
      .select('id')
      .eq('coach_id', coachId)
      .eq('client_id', clientId)
      .limit(1);

    if (relationError || !coachClientRelation || coachClientRelation.length === 0) {
      return ApiResponseHelper.forbidden('You do not have access to this client');
    }

    // Update or create coach notes for this client
    const { data: existingNote, error: fetchError } = await supabase
      .from('coach_notes')
      .select('id')
      .eq('coach_id', coachId)
      .eq('client_id', clientId)
      .eq('privacy_level', 'private')
      .single();

    if (fetchError) {
      console.warn('[/api/coach/clients/:id] Failed to fetch existing coach note', fetchError);
    }

    if (existingNote) {
      // Update existing note
      const { error: updateError } = await supabase
        .from('coach_notes')
        .update({ 
          content: notes, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', existingNote.id);

      if (updateError) {
        throw new ApiError('UPDATE_NOTES_FAILED', 'Failed to update client notes', 500);
      }
    } else {
      // Create new note
      const { error: insertError } = await supabase
        .from('coach_notes')
        .insert({
          coach_id: coachId,
          client_id: clientId,
          title: `Notes for ${clientId}`,
          content: notes,
          privacy_level: 'private',
          tags: [],
        });

      if (insertError) {
        throw new ApiError('CREATE_NOTES_FAILED', 'Failed to create client notes', 500);
      }
    }

    return ApiResponseHelper.success({ message: 'Client notes updated successfully' });

  } catch (error) {
    console.error('Update client notes API error:', error);
    
    if (error instanceof ApiError) {
      return ApiResponseHelper.error(error.code, error.message, error.statusCode);
    }
    
    return ApiResponseHelper.internalError('Failed to update client notes');
  }
}