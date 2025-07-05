import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createNoteSchema = z.object({
  clientId: z.string().min(1),
  sessionId: z.string().optional(),
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(2000),
  privacyLevel: z.enum(['private', 'shared_with_client']),
  tags: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('coach_notes')
      .select(`
        id,
        client_id,
        session_id,
        title,
        content,
        privacy_level,
        tags,
        created_at,
        updated_at
      `)
      .eq('coach_id', user.id)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (clientId) {
      query = query.eq('client_id', clientId);
    }
    if (privacyLevel) {
      query = query.eq('privacy_level', privacyLevel);
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    const { data: notes, error } = await query;

    if (error) {
      console.error('Error fetching notes:', error);
      return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('coach_notes')
      .select('*', { count: 'exact', head: true })
      .eq('coach_id', user.id);

    if (clientId) {
      countQuery = countQuery.eq('client_id', clientId);
    }
    if (privacyLevel) {
      countQuery = countQuery.eq('privacy_level', privacyLevel);
    }
    if (search) {
      countQuery = countQuery.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    const { count: totalCount } = await countQuery;

    const totalPages = Math.ceil((totalCount || 0) / limit);

    // Transform data to match frontend interface
    const transformedNotes = notes?.map(note => ({
      id: note.id,
      clientId: note.client_id,
      sessionId: note.session_id,
      title: note.title,
      content: note.content,
      privacyLevel: note.privacy_level,
      tags: note.tags || [],
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
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createNoteSchema.parse(body);

    // Verify user is a coach
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'coach') {
      return NextResponse.json({ error: 'Only coaches can create notes' }, { status: 403 });
    }

    // Verify client exists and coach has access
    const { data: clientExists } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', validatedData.clientId)
      .eq('role', 'client')
      .single();

    if (!clientExists) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // If sessionId provided, verify it exists and belongs to the coach and client
    if (validatedData.sessionId) {
      const { data: sessionExists } = await supabase
        .from('sessions')
        .select('id')
        .eq('id', validatedData.sessionId)
        .eq('coach_id', user.id)
        .eq('client_id', validatedData.clientId)
        .single();

      if (!sessionExists) {
        return NextResponse.json({ error: 'Session not found or access denied' }, { status: 404 });
      }
    }

    // Create note
    const { data: note, error } = await supabase
      .from('coach_notes')
      .insert({
        coach_id: user.id,
        client_id: validatedData.clientId,
        session_id: validatedData.sessionId || null,
        title: validatedData.title,
        content: validatedData.content,
        privacy_level: validatedData.privacyLevel,
        tags: validatedData.tags || [],
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating note:', error);
      return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
    }

    // Transform response
    const transformedNote = {
      id: note.id,
      clientId: note.client_id,
      sessionId: note.session_id,
      title: note.title,
      content: note.content,
      privacyLevel: note.privacy_level,
      tags: note.tags || [],
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