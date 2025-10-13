import { NextRequest } from 'next/server';

import { ApiError } from '@/lib/api/errors';
import { ApiResponseHelper } from '@/lib/api/types';
import { authService } from '@/lib/services/auth-service';
import { createServerClient } from '@/lib/supabase/server';

interface SessionNotes {
  id: string;
  sessionId: string;
  content: string;
  keyInsights: string[];
  actionItems: string[];
  createdAt: string;
  updatedAt: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<Response> {
  try {
    // Verify authentication and get user
    const session = await authService.getSession();
    if (!session?.user) {
      return ApiResponseHelper.unauthorized('Authentication required');
    }

    const isAdmin = session.user.role === 'admin';
    if (session.user.role !== 'client' && !isAdmin) {
      return ApiResponseHelper.forbidden(`Client access required. Current role: ${session.user.role}`);
    }

    const userId = session.user.id;
    const sessionId = params.id;
    const supabase = createServerClient();

    // First, verify that the user is the client for this session
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('id, client_id, coach_id, status')
      .eq('id', sessionId)
      .single();

    if (sessionError || !sessionData) {
      return ApiResponseHelper.notFound('Session not found');
    }

    // Check if user is the client for this session
    if (!isAdmin && sessionData.client_id !== userId) {
      return ApiResponseHelper.forbidden('You can only view notes for your own sessions');
    }

    // Only allow viewing notes for completed sessions
    if (sessionData.status !== 'completed') {
      return ApiResponseHelper.badRequest('Notes are only available for completed sessions');
    }

    // Fetch session notes
    // Notes could be stored in the sessions table or a separate notes table
    // For now, we'll check if there's a notes field in the sessions table
    const { data: notesData, error: notesError } = await supabase
      .from('sessions')
      .select('notes, key_insights, action_items, created_at, updated_at')
      .eq('id', sessionId)
      .single();

    if (notesError) {
      throw new ApiError('FETCH_NOTES_FAILED', 'Failed to fetch session notes', 500);
    }

    // If no notes exist, return null
    if (!notesData || !notesData.notes) {
      return ApiResponseHelper.success(null);
    }

    // Format the response
    const formattedNotes: SessionNotes = {
      id: sessionId,
      sessionId: sessionId,
      content: notesData.notes || '',
      keyInsights: notesData.key_insights || [],
      actionItems: notesData.action_items || [],
      createdAt: notesData.created_at,
      updatedAt: notesData.updated_at,
    };

    return ApiResponseHelper.success(formattedNotes);

  } catch (error) {
    console.error('Session notes API error:', error);

    if (error instanceof ApiError) {
      return ApiResponseHelper.error(error.code, error.message, error.statusCode);
    }

    return ApiResponseHelper.internalError('Failed to fetch session notes');
  }
}
