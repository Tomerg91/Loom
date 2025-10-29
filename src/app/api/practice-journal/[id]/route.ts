import { NextRequest, NextResponse } from 'next/server';

import { ApiError } from '@/lib/api/errors';
import { createAuthenticatedSupabaseClient, propagateCookies } from '@/lib/api/auth-client';
import {
  mapPracticeJournalEntry,
  type PracticeJournalEntry,
  type PracticeJournalEntryRow,
} from '@/lib/api/practice-journal/transformers';
import { ApiResponseHelper } from '@/lib/api/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET: Fetch single practice journal entry
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<Response> {
  const { client: supabase, response: authResponse } = createAuthenticatedSupabaseClient(
    request,
    new NextResponse()
  );

  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      const errorResponse = ApiResponseHelper.unauthorized('Authentication required');
      return propagateCookies(authResponse, errorResponse);
    }

    const { id } = await context.params;
    // Casting is required until the Supabase generated types include practice_journal_entries
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const practiceJournalClient = supabase as any;

    const { data, error } = await practiceJournalClient
      .from('practice_journal_entries')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        const errorResponse = ApiResponseHelper.notFound('Practice journal entry not found');
        return propagateCookies(authResponse, errorResponse);
      }
      throw new ApiError('FETCH_ERROR', 'Failed to fetch practice journal entry', 500);
    }

    // Check permissions
    if (
      session.user.role === 'client' &&
      data.client_id !== session.user.id
    ) {
      const errorResponse = ApiResponseHelper.forbidden('You can only view your own journal entries');
      return propagateCookies(authResponse, errorResponse);
    }

    if (
      session.user.role === 'coach' &&
      !data.shared_with_coach
    ) {
      const errorResponse = ApiResponseHelper.forbidden('This entry has not been shared with you');
      return propagateCookies(authResponse, errorResponse);
    }

    const entry = mapPracticeJournalEntry(data as PracticeJournalEntryRow);

    const successResponse = ApiResponseHelper.success<PracticeJournalEntry>(entry);
    return propagateCookies(authResponse, successResponse);
  } catch (error) {
    console.error('Error fetching practice journal entry:', error);
    if (error instanceof ApiError) {
      const errorResponse = ApiResponseHelper.error(error.code, error.message, error.statusCode);
      return propagateCookies(authResponse, errorResponse);
    }
    const internalErrorResponse = ApiResponseHelper.internalError('An unexpected error occurred');
    return propagateCookies(authResponse, internalErrorResponse);
  }
}

// PUT: Update practice journal entry
export async function PUT(
  request: NextRequest,
  context: RouteContext
): Promise<Response> {
  const { client: supabase, response: authResponse } = createAuthenticatedSupabaseClient(
    request,
    new NextResponse()
  );

  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      const errorResponse = ApiResponseHelper.unauthorized('Authentication required');
      return propagateCookies(authResponse, errorResponse);
    }

    if (session.user.role !== 'client' && session.user.role !== 'admin') {
      const errorResponse = ApiResponseHelper.forbidden('Only clients can update their journal entries');
      return propagateCookies(authResponse, errorResponse);
    }

    const { id } = await context.params;
    const body = await request.json();
    const {
      content,
      title,
      sensations,
      emotions,
      bodyAreas,
      insights,
      practicesDone,
      moodRating,
      energyLevel,
      sharedWithCoach,
      sessionId,
    } = body;

    // Validation
    if (content && content.length > 10000) {
      const errorResponse = ApiResponseHelper.badRequest('Content must be less than 10,000 characters');
      return propagateCookies(authResponse, errorResponse);
    }

    if (moodRating && (moodRating < 1 || moodRating > 10)) {
      const errorResponse = ApiResponseHelper.badRequest('Mood rating must be between 1 and 10');
      return propagateCookies(authResponse, errorResponse);
    }

    if (energyLevel && (energyLevel < 1 || energyLevel > 10)) {
      const errorResponse = ApiResponseHelper.badRequest('Energy level must be between 1 and 10');
      return propagateCookies(authResponse, errorResponse);
    }

    // Casting is required until the Supabase generated types include practice_journal_entries
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const practiceJournalClient = supabase as any;

    // First check if entry exists and belongs to user
    const { data: existingData, error: fetchError } = await practiceJournalClient
      .from('practice_journal_entries')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        const errorResponse = ApiResponseHelper.notFound('Practice journal entry not found');
        return propagateCookies(authResponse, errorResponse);
      }
      throw new ApiError('FETCH_ERROR', 'Failed to fetch practice journal entry', 500);
    }

    const existing = existingData as PracticeJournalEntryRow;

    if (existing.client_id !== session.user.id && session.user.role !== 'admin') {
      const errorResponse = ApiResponseHelper.forbidden('You can only update your own journal entries');
      return propagateCookies(authResponse, errorResponse);
    }

    const updates: Partial<PracticeJournalEntryRow> = {};

    if (content !== undefined) updates.content = content.trim();
    if (title !== undefined) updates.title = title?.trim() || null;
    if (sensations !== undefined) updates.sensations = sensations;
    if (emotions !== undefined) updates.emotions = emotions;
    if (bodyAreas !== undefined) updates.body_areas = bodyAreas;
    if (insights !== undefined) updates.insights = insights?.trim() || null;
    if (practicesDone !== undefined) updates.practices_done = practicesDone;
    if (moodRating !== undefined) updates.mood_rating = moodRating;
    if (energyLevel !== undefined) updates.energy_level = energyLevel;
    if (sessionId !== undefined) updates.session_id = sessionId;

    // Handle sharing
    if (sharedWithCoach !== undefined) {
      updates.shared_with_coach = sharedWithCoach;
      if (sharedWithCoach && !existing.shared_with_coach) {
        updates.shared_at = new Date().toISOString();
      } else if (!sharedWithCoach) {
        updates.shared_at = null;
      }
    }

    const { data, error } = await practiceJournalClient
      .from('practice_journal_entries')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new ApiError('UPDATE_ERROR', 'Failed to update practice journal entry', 500);
    }

    const entry = mapPracticeJournalEntry(data as PracticeJournalEntryRow);

    const successResponse = ApiResponseHelper.success<PracticeJournalEntry>(
      entry,
      'Practice journal entry updated successfully'
    );
    return propagateCookies(authResponse, successResponse);
  } catch (error) {
    console.error('Error updating practice journal entry:', error);
    if (error instanceof ApiError) {
      const errorResponse = ApiResponseHelper.error(error.code, error.message, error.statusCode);
      return propagateCookies(authResponse, errorResponse);
    }
    const internalErrorResponse = ApiResponseHelper.internalError('An unexpected error occurred');
    return propagateCookies(authResponse, internalErrorResponse);
  }
}

// DELETE: Delete practice journal entry
export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<Response> {
  const { client: supabase, response: authResponse } = createAuthenticatedSupabaseClient(
    request,
    new NextResponse()
  );

  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      const errorResponse = ApiResponseHelper.unauthorized('Authentication required');
      return propagateCookies(authResponse, errorResponse);
    }

    if (session.user.role !== 'client' && session.user.role !== 'admin') {
      const errorResponse = ApiResponseHelper.forbidden('Only clients can delete their journal entries');
      return propagateCookies(authResponse, errorResponse);
    }

    const { id } = await context.params;
    // Casting is required until the Supabase generated types include practice_journal_entries
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const practiceJournalClient = supabase as any;

    // First check if entry exists and belongs to user
    const { data: existingData, error: fetchError } = await practiceJournalClient
      .from('practice_journal_entries')
      .select('client_id')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        const errorResponse = ApiResponseHelper.notFound('Practice journal entry not found');
        return propagateCookies(authResponse, errorResponse);
      }
      throw new ApiError('FETCH_ERROR', 'Failed to fetch practice journal entry', 500);
    }

    const existing = existingData as Pick<PracticeJournalEntryRow, 'client_id'>;

    if (existing.client_id !== session.user.id && session.user.role !== 'admin') {
      const errorResponse = ApiResponseHelper.forbidden('You can only delete your own journal entries');
      return propagateCookies(authResponse, errorResponse);
    }

    const { error } = await practiceJournalClient
      .from('practice_journal_entries')
      .delete()
      .eq('id', id);

    if (error) {
      throw new ApiError('DELETE_ERROR', 'Failed to delete practice journal entry', 500);
    }

    const successResponse = ApiResponseHelper.success(null, 'Practice journal entry deleted successfully');
    return propagateCookies(authResponse, successResponse);
  } catch (error) {
    console.error('Error deleting practice journal entry:', error);
    if (error instanceof ApiError) {
      const errorResponse = ApiResponseHelper.error(error.code, error.message, error.statusCode);
      return propagateCookies(authResponse, errorResponse);
    }
    const internalErrorResponse = ApiResponseHelper.internalError('An unexpected error occurred');
    return propagateCookies(authResponse, internalErrorResponse);
  }
}