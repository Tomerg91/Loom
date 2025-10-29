import { NextRequest } from 'next/server';

import { ApiError } from '@/lib/api/errors';
import { getAuthenticatedUser } from '@/lib/api/authenticated-request';
import {
  mapPracticeJournalEntry,
  type PracticeJournalEntry,
  type PracticeJournalEntryRow,
} from '@/lib/api/practice-journal/transformers';
import { ApiResponseHelper } from '@/lib/api/types';
import { createClient } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET: Fetch single practice journal entry
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<Response> {
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return ApiResponseHelper.unauthorized('Authentication required');
    }

    const { id } = await context.params;
    const supabase = createClient();
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
        return ApiResponseHelper.notFound('Practice journal entry not found');
      }
      throw new ApiError('FETCH_ERROR', 'Failed to fetch practice journal entry', 500);
    }

    // Check permissions
    if (
      user.role === 'client' &&
      data.client_id !== user.id
    ) {
      return ApiResponseHelper.forbidden('You can only view your own journal entries');
    }

    if (
      user.role === 'coach' &&
      !data.shared_with_coach
    ) {
      return ApiResponseHelper.forbidden('This entry has not been shared with you');
    }

    const entry = mapPracticeJournalEntry(data as PracticeJournalEntryRow);

    return ApiResponseHelper.success<PracticeJournalEntry>(entry);
  } catch (error) {
    console.error('Error fetching practice journal entry:', error);
    if (error instanceof ApiError) {
      return ApiResponseHelper.error(error.code, error.message, error.statusCode);
    }
    return ApiResponseHelper.internalError('An unexpected error occurred');
  }
}

// PUT: Update practice journal entry
export async function PUT(
  request: NextRequest,
  context: RouteContext
): Promise<Response> {
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return ApiResponseHelper.unauthorized('Authentication required');
    }

    if (user.role !== 'client' && user.role !== 'admin') {
      return ApiResponseHelper.forbidden('Only clients can update their journal entries');
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
      return ApiResponseHelper.badRequest('Content must be less than 10,000 characters');
    }

    if (moodRating && (moodRating < 1 || moodRating > 10)) {
      return ApiResponseHelper.badRequest('Mood rating must be between 1 and 10');
    }

    if (energyLevel && (energyLevel < 1 || energyLevel > 10)) {
      return ApiResponseHelper.badRequest('Energy level must be between 1 and 10');
    }

    const supabase = createClient();
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
        return ApiResponseHelper.notFound('Practice journal entry not found');
      }
      throw new ApiError('FETCH_ERROR', 'Failed to fetch practice journal entry', 500);
    }

    const existing = existingData as PracticeJournalEntryRow;

    if (existing.client_id !== user.id && user.role !== 'admin') {
      return ApiResponseHelper.forbidden('You can only update your own journal entries');
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

    return ApiResponseHelper.success<PracticeJournalEntry>(
      entry,
      'Practice journal entry updated successfully'
    );
  } catch (error) {
    console.error('Error updating practice journal entry:', error);
    if (error instanceof ApiError) {
      return ApiResponseHelper.error(error.code, error.message, error.statusCode);
    }
    return ApiResponseHelper.internalError('An unexpected error occurred');
  }
}

// DELETE: Delete practice journal entry
export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<Response> {
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return ApiResponseHelper.unauthorized('Authentication required');
    }

    if (user.role !== 'client' && user.role !== 'admin') {
      return ApiResponseHelper.forbidden('Only clients can delete their journal entries');
    }

    const { id } = await context.params;
    const supabase = createClient();
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
        return ApiResponseHelper.notFound('Practice journal entry not found');
      }
      throw new ApiError('FETCH_ERROR', 'Failed to fetch practice journal entry', 500);
    }

    const existing = existingData as Pick<PracticeJournalEntryRow, 'client_id'>;

    if (existing.client_id !== user.id && user.role !== 'admin') {
      return ApiResponseHelper.forbidden('You can only delete your own journal entries');
    }

    const { error } = await practiceJournalClient
      .from('practice_journal_entries')
      .delete()
      .eq('id', id);

    if (error) {
      throw new ApiError('DELETE_ERROR', 'Failed to delete practice journal entry', 500);
    }

    return ApiResponseHelper.success(null, 'Practice journal entry deleted successfully');
  } catch (error) {
    console.error('Error deleting practice journal entry:', error);
    if (error instanceof ApiError) {
      return ApiResponseHelper.error(error.code, error.message, error.statusCode);
    }
    return ApiResponseHelper.internalError('An unexpected error occurred');
  }
}