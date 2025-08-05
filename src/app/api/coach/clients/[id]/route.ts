import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/auth-service';
import { ApiResponseHelper } from '@/lib/api/types';
import { ApiError } from '@/lib/api/errors';
import { createServerClient } from '@/lib/supabase/server';

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
  { params }: { params: { id: string } }
): Promise<Response> {
  try {
    // Verify authentication and get user
    const session = await authService.getSession();
    if (!session?.user || session.user.role !== 'coach') {
      return ApiResponseHelper.forbidden('Coach access required');
    }

    const coachId = session.user.id;
    const clientId = params.id;

    if (!clientId) {
      return ApiResponseHelper.badRequest('Client ID is required');
    }

    const supabase = createServerClient();

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
        session_type,
        created_at
      `)
      .eq('coach_id', coachId)
      .eq('client_id', clientId)
      .order('scheduled_at', { ascending: false });

    if (sessionsError) {
      throw new ApiError('FETCH_SESSIONS_FAILED', 'Failed to fetch client sessions', 500);
    }

    // Get client notes from this coach
    const { data: notes, error: notesError } = await supabase
      .from('coach_notes')
      .select('content')
      .eq('coach_id', coachId)
      .eq('client_id', clientId)
      .eq('privacy_level', 'private')
      .order('created_at', { ascending: false })
      .limit(1);

    // Get session reflections for rating calculation
    const { data: reflections, error: reflectionsError } = await supabase
      .from('reflections')
      .select('mood_rating, session_id')
      .in('session_id', sessions?.map(s => s.id) || []);

    // Calculate statistics
    const totalSessions = sessions?.length || 0;
    const completedSessions = sessions?.filter(s => s.status === 'completed').length || 0;
    
    // Calculate average rating from reflections
    const ratingsWithValues = reflections?.filter(r => r.mood_rating && r.mood_rating > 0) || [];
    const averageRating = ratingsWithValues.length > 0 
      ? ratingsWithValues.reduce((sum, r) => sum + r.mood_rating, 0) / ratingsWithValues.length
      : 0;

    // Determine client status based on recent activity
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const hasRecentSession = sessions?.some(s => new Date(s.scheduled_at) >= thirtyDaysAgo);
    const clientStatus = hasRecentSession ? 'active' : 'inactive';

    // Calculate progress (simplified - based on completed sessions vs total)
    const progressPercentage = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

    // Transform sessions for response
    const sessionDetails: SessionDetail[] = sessions?.map(session => {
      const reflection = reflections?.find(r => r.session_id === session.id);
      return {
        id: session.id,
        date: session.scheduled_at,
        duration: session.duration_minutes || 60,
        status: session.status as 'completed' | 'scheduled' | 'cancelled',
        rating: reflection?.mood_rating || undefined,
        notes: session.description || undefined,
        type: session.session_type === 'video' ? 'video' : 'in-person',
        title: session.title || undefined,
      };
    }) || [];

    // Mock goals for now - this would come from a goals table in production
    const mockGoals = ['Improve Wellness', 'Build Confidence', 'Career Development'];

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
      goals: mockGoals, // TODO: Replace with real goals from database
      notes: notes?.[0]?.content || '',
      progress: {
        current: progressPercentage,
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
  { params }: { params: { id: string } }
): Promise<Response> {
  try {
    // Verify authentication and get user
    const session = await authService.getSession();
    if (!session?.user || session.user.role !== 'coach') {
      return ApiResponseHelper.forbidden('Coach access required');
    }

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

    const supabase = createServerClient();

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