import { NextRequest } from 'next/server';
import { authService } from '@/lib/services/auth-service';
import { ApiResponseHelper } from '@/lib/api/types';
import { ApiError } from '@/lib/api/errors';
import { createServerClient } from '@/lib/supabase/server';

interface RecentReflection {
  id: string;
  sessionId?: string;
  content: string;
  moodRating?: number;
  createdAt: string;
  sessionTitle?: string;
}

export async function GET(request: NextRequest): Promise<Response> {
  try {
    // Verify authentication and get user
    const session = await authService.getSession();
    if (!session?.user) {
      return ApiResponseHelper.unauthorized('Authentication required');
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const supabase = createServerClient();

    // Fetch recent reflections with optional session information
    const { data: reflections, error } = await supabase
      .from('reflections')
      .select(`
        id,
        content,
        mood_rating,
        created_at,
        session_id,
        sessions (
          title
        )
      `)
      .eq('client_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new ApiError('FETCH_REFLECTIONS_FAILED', 'Failed to fetch reflections', 500);
    }

    const formattedReflections: RecentReflection[] = (reflections || []).map(reflection => {
      const sessions = Array.isArray(reflection.sessions) ? reflection.sessions[0] : reflection.sessions;
      return {
        id: reflection.id,
        sessionId: reflection.session_id || undefined,
        content: reflection.content,
        moodRating: reflection.mood_rating || undefined,
        createdAt: reflection.created_at,
        sessionTitle: sessions?.title || undefined,
      };
    });

    return ApiResponseHelper.success(formattedReflections);

  } catch (error) {
    console.error('Client reflections API error:', error);
    
    if (error instanceof ApiError) {
      return ApiResponseHelper.error(error.code, error.message, error.statusCode);
    }
    
    return ApiResponseHelper.internalError('Failed to fetch client reflections');
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    // Verify authentication and get user
    const session = await authService.getSession();
    if (!session?.user) {
      return ApiResponseHelper.unauthorized('Authentication required');
    }

    const userId = session.user.id;
    const body = await request.json();

    const { content, moodRating, sessionId, insights, goalsForNextSession } = body;

    if (!content || content.trim().length === 0) {
      return ApiResponseHelper.badRequest('Content is required');
    }

    const supabase = createServerClient();

    // Create new reflection
    const { data: reflection, error } = await supabase
      .from('reflections')
      .insert({
        client_id: userId,
        content: content.trim(),
        mood_rating: moodRating || null,
        session_id: sessionId || null,
        insights: insights || null,
        goals_for_next_session: goalsForNextSession || null,
      })
      .select()
      .single();

    if (error) {
      throw new ApiError('CREATE_REFLECTION_FAILED', 'Failed to create reflection', 500);
    }

    return ApiResponseHelper.success(reflection);

  } catch (error) {
    console.error('Create reflection API error:', error);
    
    if (error instanceof ApiError) {
      return ApiResponseHelper.error(error.code, error.message, error.statusCode);
    }
    
    return ApiResponseHelper.internalError('Failed to create reflection');
  }
}