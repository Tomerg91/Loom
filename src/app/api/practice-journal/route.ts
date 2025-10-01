import { NextRequest } from 'next/server';

import { ApiError } from '@/lib/api/errors';
import {
  mapPracticeJournalEntries,
  mapPracticeJournalEntry,
  type PracticeJournalEntry,
} from '@/lib/api/practice-journal/transformers';
import { ApiResponseHelper } from '@/lib/api/types';
import { authService } from '@/lib/services/auth-service';
import { createServerClient } from '@/lib/supabase/server';

// GET: Fetch practice journal entries
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const session = await authService.getSession();
    if (!session?.user) {
      return ApiResponseHelper.unauthorized('Authentication required');
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const sharedOnly = searchParams.get('sharedOnly') === 'true';
    const search = searchParams.get('search') || '';
    const sessionId = searchParams.get('sessionId');

    // Casting is required until the Supabase generated types include practice_journal_entries
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const practiceJournalClient = createServerClient() as any;

    let query = practiceJournalClient
      .from('practice_journal_entries')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by user role
    if (session.user.role === 'client') {
      // Clients see their own entries
      query = query.eq('client_id', userId);
    } else if (session.user.role === 'coach') {
      // Coaches see only shared entries
      query = query.eq('shared_with_coach', true);
    }
    // Admins see all entries (no filter)

    // Additional filters
    if (sharedOnly && session.user.role === 'client') {
      query = query.eq('shared_with_coach', true);
    }

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    if (search) {
      query = query.or(`content.ilike.%${search}%,title.ilike.%${search}%,insights.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new ApiError(500, 'Failed to fetch practice journal entries', { supabaseError: error });
    }

    const entries: PracticeJournalEntry[] = mapPracticeJournalEntries(data);

    return ApiResponseHelper.success({
      entries,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: count ? offset + limit < count : false,
      },
    });
  } catch (error) {
    console.error('Error fetching practice journal entries:', error);
    if (error instanceof ApiError) {
      return ApiResponseHelper.error(error);
    }
    return ApiResponseHelper.internalError('An unexpected error occurred');
  }
}

// POST: Create new practice journal entry
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const session = await authService.getSession();
    if (!session?.user) {
      return ApiResponseHelper.unauthorized('Authentication required');
    }

    if (session.user.role !== 'client' && session.user.role !== 'admin') {
      return ApiResponseHelper.forbidden('Only clients can create practice journal entries');
    }

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
    if (!content || content.trim().length === 0) {
      return ApiResponseHelper.badRequest('Content is required');
    }

    if (content.length > 10000) {
      return ApiResponseHelper.badRequest('Content must be less than 10,000 characters');
    }

    if (moodRating && (moodRating < 1 || moodRating > 10)) {
      return ApiResponseHelper.badRequest('Mood rating must be between 1 and 10');
    }

    if (energyLevel && (energyLevel < 1 || energyLevel > 10)) {
      return ApiResponseHelper.badRequest('Energy level must be between 1 and 10');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const practiceJournalClient = createServerClient() as any;

    const newEntry = {
      client_id: session.user.id,
      content: content.trim(),
      title: title?.trim() || null,
      sensations: sensations || null,
      emotions: emotions || null,
      body_areas: bodyAreas || null,
      insights: insights?.trim() || null,
      practices_done: practicesDone || null,
      mood_rating: moodRating || null,
      energy_level: energyLevel || null,
      shared_with_coach: sharedWithCoach || false,
      shared_at: sharedWithCoach ? new Date().toISOString() : null,
      session_id: sessionId || null,
    };

    const { data, error } = await practiceJournalClient
      .from('practice_journal_entries')
      .insert(newEntry)
      .select()
      .single();

    if (error) {
      throw new ApiError(500, 'Failed to create practice journal entry', { supabaseError: error });
    }

    const entry = mapPracticeJournalEntry(data);

    return ApiResponseHelper.created(entry, 'Practice journal entry created successfully');
  } catch (error) {
    console.error('Error creating practice journal entry:', error);
    if (error instanceof ApiError) {
      return ApiResponseHelper.error(error);
    }
    return ApiResponseHelper.internalError('An unexpected error occurred');
  }
}