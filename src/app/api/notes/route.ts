import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createNoteSchema = z.object({
  clientId: z.string().min(1).optional(),
  sessionId: z.string().optional(),
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(10000),
  privacyLevel: z.enum(['private', 'shared_with_coach']).optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  isFavorite: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to determine role
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const clientId = searchParams.get('clientId');
    const privacyLevel = searchParams.get('privacyLevel');
    const search = searchParams.get('search');
    const tags = searchParams.get('tags');
    const category = searchParams.get('category');
    const isArchived = searchParams.get('isArchived') === 'true';
    const hasIsArchived = searchParams.has('isArchived');
    const isFavorite = searchParams.get('isFavorite') === 'true';

    const offset = (page - 1) * limit;

    // Determine which table to query based on user role
    const tableName = profile.role === 'coach' ? 'coach_notes' : 'client_notes';
    const ownerField = profile.role === 'coach' ? 'coach_id' : 'client_id';

    // Build initial query - use any type to avoid complex union type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any;

    if (profile.role === 'coach') {
      query = supabase
        .from(tableName)
        .select('id, client_id, session_id, title, content, privacy_level, tags, category, is_favorite, is_archived, created_at, updated_at')
        .eq(ownerField, user.id)
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(offset, offset + limit - 1);
    } else {
      query = supabase
        .from(tableName)
        .select('id, session_id, title, content, privacy_level, tags, category, is_favorite, is_archived, created_at, updated_at')
        .eq(ownerField, user.id)
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(offset, offset + limit - 1);
    }

    // Apply filters
    if (clientId && profile.role === 'coach') {
      query = query.eq('client_id', clientId);
    }
    if (privacyLevel && (privacyLevel === 'private' || privacyLevel === 'shared_with_coach')) {
      query = query.eq('privacy_level', privacyLevel);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (hasIsArchived) {
      query = query.eq('is_archived', isArchived);
    }
    if (isFavorite) {
      query = query.eq('is_favorite', true);
    }
    if (search) {
      // Sanitize search input to prevent SQL injection
      const sanitizedSearch = search.replace(/[%_\\]/g, '\\$&').replace(/'/g, "''");
      query = query.or(`title.ilike.%${sanitizedSearch}%,content.ilike.%${sanitizedSearch}%`);
    }
    if (tags) {
      // Filter by tags - notes must contain all specified tags
      const tagList = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      if (tagList.length > 0) {
        // Use contains operator to check if tags array contains all specified tags
        query = query.contains('tags', tagList);
      }
    }

    const { data: notes, error } = await query;

    if (error) {
      console.error('Error fetching notes:', error);
      return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
    }

    // Get total count for pagination - use type assertion to avoid complex union type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let countQuery: any = supabase
      .from(tableName)
      .select('id', { count: 'exact', head: true })
      .eq(ownerField, user.id);

    if (clientId && profile.role === 'coach') {
      countQuery = countQuery.eq('client_id', clientId);
    }
    if (privacyLevel && (privacyLevel === 'private' || privacyLevel === 'shared_with_coach')) {
      countQuery = countQuery.eq('privacy_level', privacyLevel);
    }
    if (category) {
      countQuery = countQuery.eq('category', category);
    }
    if (hasIsArchived) {
      countQuery = countQuery.eq('is_archived', isArchived);
    }
    if (isFavorite) {
      countQuery = countQuery.eq('is_favorite', true);
    }
    if (search) {
      // Sanitize search input to prevent SQL injection
      const sanitizedSearch = search.replace(/[%_\\]/g, '\\$&').replace(/'/g, "''");
      countQuery = countQuery.or(`title.ilike.%${sanitizedSearch}%,content.ilike.%${sanitizedSearch}%`);
    }
    if (tags) {
      // Filter by tags - notes must contain all specified tags
      const tagList = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      if (tagList.length > 0) {
        countQuery = countQuery.contains('tags', tagList);
      }
    }

    const { count: totalCount } = await countQuery;

    const totalPages = Math.ceil((totalCount || 0) / limit);

    // Transform data to match frontend interface
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transformedNotes = notes?.map((note: any) => ({
      id: note.id,
      ...(profile.role === 'coach' && note.client_id && { clientId: note.client_id }),
      sessionId: note.session_id,
      title: note.title,
      content: note.content,
      privacyLevel: note.privacy_level,
      tags: note.tags || [],
      category: note.category,
      isFavorite: note.is_favorite || false,
      isArchived: note.is_archived || false,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
    })) || [];

    return NextResponse.json({
      data: transformedNotes,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Error in notes GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createNoteSchema.parse(body);

    // Get user profile
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Determine table and prepare data based on user role
    const tableName = profile.role === 'coach' ? 'coach_notes' : 'client_notes';
    const ownerField = profile.role === 'coach' ? 'coach_id' : 'client_id';

    // For coach notes, verify client exists and coach has access
    if (profile.role === 'coach' && validatedData.clientId) {
      const { data: clientExists } = await supabase
        .from('users')
        .select('id')
        .eq('id', validatedData.clientId)
        .eq('role', 'client')
        .single();

      if (!clientExists) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 });
      }
    }

    // If sessionId provided, verify it exists and belongs to the user
    if (validatedData.sessionId) {
      let sessionQuery = supabase
        .from('sessions')
        .select('id');

      if (profile.role === 'coach') {
        sessionQuery = sessionQuery.eq('coach_id', user.id);
        if (validatedData.clientId) {
          sessionQuery = sessionQuery.eq('client_id', validatedData.clientId);
        }
      } else {
        sessionQuery = sessionQuery.eq('client_id', user.id);
      }

      const { data: sessionExists } = await sessionQuery.eq('id', validatedData.sessionId).single();

      if (!sessionExists) {
        return NextResponse.json({ error: 'Session not found or access denied' }, { status: 404 });
      }
    }

    // Prepare insert data
    const insertData: any = {
      [ownerField]: user.id,
      session_id: validatedData.sessionId || null,
      title: validatedData.title,
      content: validatedData.content,
      privacy_level: validatedData.privacyLevel || 'private',
      tags: validatedData.tags || [],
      category: validatedData.category || null,
      is_favorite: validatedData.isFavorite || false,
      is_archived: validatedData.isArchived || false,
    };

    // Add client_id for coach notes
    if (profile.role === 'coach' && validatedData.clientId) {
      insertData.client_id = validatedData.clientId;
    }

    // Create note
    const { data: note, error } = await supabase
      .from(tableName)
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating note:', error);
      return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
    }

    // Transform response
    const transformedNote = {
      id: note.id,
      ...(profile.role === 'coach' && note.client_id && { clientId: note.client_id }),
      sessionId: note.session_id,
      title: note.title,
      content: note.content,
      privacyLevel: note.privacy_level,
      tags: note.tags || [],
      category: note.category,
      isFavorite: note.is_favorite || false,
      isArchived: note.is_archived || false,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
    };

    return NextResponse.json({ data: transformedNote }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error in notes POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
