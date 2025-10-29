import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAuthenticatedSupabaseClient, propagateCookies } from '@/lib/api/auth-client';
import { createErrorResponse, HTTP_STATUS } from '@/lib/api/utils';
import { getCachedData, CacheKeys, CacheTTL, CacheInvalidation } from '@/lib/performance/cache';

const createReflectionSchema = z.object({
  sessionId: z.string().optional(),
  content: z.string().min(10).max(2000),
  moodRating: z.number().min(1).max(10).optional(),
  insights: z.string().max(1000).optional(),
  goalsForNextSession: z.string().max(1000).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { client: supabase, response: authResponse } = createAuthenticatedSupabaseClient(
      request,
      new NextResponse()
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      const errorResponse = createErrorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED);
      return propagateCookies(authResponse, errorResponse);
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const sessionId = searchParams.get('sessionId');
    const search = searchParams.get('search');
    const moodMin = searchParams.get('moodMin');
    const moodMax = searchParams.get('moodMax');

    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('reflections')
      .select(`
        id,
        client_id,
        session_id,
        content,
        mood_rating,
        insights,
        goals_for_next_session,
        created_at,
        updated_at
      `)
      .eq('client_id', user.id)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }
    if (search) {
      // Sanitize search input to prevent SQL injection
      const sanitizedSearch = search.replace(/[%_\\]/g, '\\$&').replace(/'/g, "''");
      query = query.or(`content.ilike.%${sanitizedSearch}%,insights.ilike.%${sanitizedSearch}%,goals_for_next_session.ilike.%${sanitizedSearch}%`);
    }
    if (moodMin) {
      query = query.gte('mood_rating', parseInt(moodMin));
    }
    if (moodMax) {
      query = query.lte('mood_rating', parseInt(moodMax));
    }

    // Create cache key for reflections
    const filterKey = JSON.stringify({ page, limit, sortBy, sortOrder, sessionId, search, moodMin, moodMax });
    const cacheKey = CacheKeys.reflections(user.id, filterKey);
    
    const { reflections, totalCount } = await getCachedData(
      cacheKey,
      async () => {
        const { data: reflections, error } = await query;

        if (error) {
          throw new Error(`Failed to fetch reflections: ${error.message}`);
        }

        // Get total count for pagination
        let countQuery = supabase
          .from('reflections')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', user.id);

        if (sessionId) {
          countQuery = countQuery.eq('session_id', sessionId);
        }
        if (search) {
          // Sanitize search input to prevent SQL injection
          const sanitizedSearch = search.replace(/[%_\\]/g, '\\$&').replace(/'/g, "''");
          countQuery = countQuery.or(`content.ilike.%${sanitizedSearch}%,insights.ilike.%${sanitizedSearch}%,goals_for_next_session.ilike.%${sanitizedSearch}%`);
        }
        if (moodMin) {
          countQuery = countQuery.gte('mood_rating', parseInt(moodMin));
        }
        if (moodMax) {
          countQuery = countQuery.lte('mood_rating', parseInt(moodMax));
        }

        const { count: totalCount } = await countQuery;
        return { reflections, totalCount };
      },
      CacheTTL.MEDIUM
    );

    const totalPages = Math.ceil((totalCount || 0) / limit);

    // Transform data to match frontend interface
    const transformedReflections = reflections?.map(reflection => ({
      id: reflection.id,
      clientId: reflection.client_id,
      sessionId: reflection.session_id,
      content: reflection.content,
      moodRating: reflection.mood_rating,
      insights: reflection.insights,
      goalsForNextSession: reflection.goals_for_next_session,
      createdAt: reflection.created_at,
      updatedAt: reflection.updated_at,
    })) || [];

    const successResponse = NextResponse.json({
      data: transformedReflections,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
    return propagateCookies(authResponse, successResponse);
  } catch (error) {
    console.error('Error in reflections GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { client: supabase, response: authResponse } = createAuthenticatedSupabaseClient(
      request,
      new NextResponse()
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      const errorResponse = createErrorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED);
      return propagateCookies(authResponse, errorResponse);
    }

    const body = await request.json();
    const validatedData = createReflectionSchema.parse(body);

    // Verify user is a client
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'client') {
      const errorResponse = createErrorResponse('Only clients can create reflections', HTTP_STATUS.FORBIDDEN);
      return propagateCookies(authResponse, errorResponse);
    }

    // If sessionId provided, verify it exists and belongs to the client
    if (validatedData.sessionId) {
      const { data: sessionExists } = await supabase
        .from('sessions')
        .select('id')
        .eq('id', validatedData.sessionId)
        .eq('client_id', user.id)
        .single();

      if (!sessionExists) {
        const errorResponse = createErrorResponse('Session not found or access denied', HTTP_STATUS.NOT_FOUND);
        return propagateCookies(authResponse, errorResponse);
      }
    }

    // Create reflection
    const { data: reflection, error } = await supabase
      .from('reflections')
      .insert({
        client_id: user.id,
        session_id: validatedData.sessionId || null,
        content: validatedData.content,
        mood_rating: validatedData.moodRating,
        insights: validatedData.insights,
        goals_for_next_session: validatedData.goalsForNextSession,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating reflection:', error);
      const errorResponse = createErrorResponse('Failed to create reflection', HTTP_STATUS.INTERNAL_SERVER_ERROR);
      return propagateCookies(authResponse, errorResponse);
    }

    // Invalidate cache for this user's reflections
    CacheInvalidation.user(user.id);

    // Transform response
    const transformedReflection = {
      id: reflection.id,
      clientId: reflection.client_id,
      sessionId: reflection.session_id,
      content: reflection.content,
      moodRating: reflection.mood_rating,
      insights: reflection.insights,
      goalsForNextSession: reflection.goals_for_next_session,
      createdAt: reflection.created_at,
      updatedAt: reflection.updated_at,
    };

    const successResponse = NextResponse.json({ data: transformedReflection }, { status: 201 });
    return propagateCookies(authResponse, successResponse);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error in reflections POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}