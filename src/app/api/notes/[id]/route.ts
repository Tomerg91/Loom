import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAuthenticatedSupabaseClient, propagateCookies } from '@/lib/api/auth-client';
import { createErrorResponse, HTTP_STATUS } from '@/lib/api/utils';

const updateNoteSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  content: z.string().min(1).max(10000).optional(),
  privacyLevel: z.enum(['private', 'shared_with_coach']).optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  isFavorite: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

const baseNoteSelectFields = [
  'id',
  'session_id',
  'title',
  'content',
  'privacy_level',
  'tags',
  'category',
  'is_favorite',
  'is_archived',
  'created_at',
  'updated_at'
] as const;

const buildNoteSelect = (includeClientId: boolean) =>
  [includeClientId ? 'client_id' : null, ...baseNoteSelectFields]
    .filter((field): field is string => Boolean(field))
    .join(',');

export async function GET(request: NextRequest, context: RouteContext) {
  const params = await context.params;
  try {
    const { id } = params;
    const { client: supabase, response: authResponse } = createAuthenticatedSupabaseClient(
      request,
      new NextResponse()
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      const errorResponse = createErrorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED);
      return propagateCookies(authResponse, errorResponse);
    }

    // Get user profile to determine role
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      const errorResponse = createErrorResponse('User not found', HTTP_STATUS.NOT_FOUND);
      return propagateCookies(authResponse, errorResponse);
    }

    // Determine table and owner field based on user role
    const tableName = profile.role === 'coach' ? 'coach_notes' : 'client_notes';
    const ownerField = profile.role === 'coach' ? 'coach_id' : 'client_id';

    const selectFields = buildNoteSelect(profile.role === 'coach');

    const { data, error } = await supabase
      .from(tableName)
      .select(selectFields)
      .eq('id', id)
      .eq(ownerField, user.id)
      .single();

    if (error) {
      console.error('Error fetching note:', error);
      const errorResponse = createErrorResponse('Note not found', HTTP_STATUS.NOT_FOUND);
      return propagateCookies(authResponse, errorResponse);
    }

    if (!data) {
      const errorResponse = createErrorResponse('Note not found', HTTP_STATUS.NOT_FOUND);
      return propagateCookies(authResponse, errorResponse);
    }

    // Type assertion to resolve GenericStringError union
    const note = data as unknown as Record<string, unknown>;

    // Transform response
    const transformedNote = {
      id: note.id,
      ...(profile.role === 'coach' && 'client_id' in note && note.client_id ? { clientId: note.client_id } : {}),
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

    const successResponse = NextResponse.json({ data: transformedNote });
    return propagateCookies(authResponse, successResponse);
  } catch (error) {
    console.error('Error in note GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const params = await context.params;
  try {
    const { id } = params;
    const { client: supabase, response: authResponse } = createAuthenticatedSupabaseClient(
      request,
      new NextResponse()
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      const errorResponse = createErrorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED);
      return propagateCookies(authResponse, errorResponse);
    }

    // Get user profile to determine role
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      const errorResponse = createErrorResponse('User not found', HTTP_STATUS.NOT_FOUND);
      return propagateCookies(authResponse, errorResponse);
    }

    const body = await request.json();
    const validatedData = updateNoteSchema.parse(body);

    // Determine table and owner field based on user role
    const tableName = profile.role === 'coach' ? 'coach_notes' : 'client_notes';
    const ownerField = profile.role === 'coach' ? 'coach_id' : 'client_id';

    // Verify note exists and belongs to user
    const { data: existingNote, error: fetchError } = await supabase
      .from(tableName)
      .select(`id, ${ownerField}`)
      .eq('id', id)
      .eq(ownerField, user.id)
      .single();

    if (fetchError || !existingNote) {
      const errorResponse = createErrorResponse('Note not found', HTTP_STATUS.NOT_FOUND);
      return propagateCookies(authResponse, errorResponse);
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      ...validatedData,
      updated_at: new Date().toISOString(),
    };

    // Convert frontend field names to database field names
    if (validatedData.isFavorite !== undefined) {
      updateData.is_favorite = validatedData.isFavorite;
      delete updateData.isFavorite;
    }
    if (validatedData.isArchived !== undefined) {
      updateData.is_archived = validatedData.isArchived;
      delete updateData.isArchived;
    }
    if (validatedData.privacyLevel !== undefined) {
      updateData.privacy_level = validatedData.privacyLevel;
      delete updateData.privacyLevel;
    }

    // Update note
    const selectFields = buildNoteSelect(profile.role === 'coach');

    const { data, error } = await supabase
      .from(tableName)
      .update(updateData)
      .eq('id', id)
      .eq(ownerField, user.id)
      .select(selectFields)
      .single();

    if (error) {
      console.error('Error updating note:', error);
      const errorResponse = createErrorResponse('Failed to update note', HTTP_STATUS.INTERNAL_SERVER_ERROR);
      return propagateCookies(authResponse, errorResponse);
    }

    if (!data) {
      const errorResponse = createErrorResponse('Failed to update note', HTTP_STATUS.INTERNAL_SERVER_ERROR);
      return propagateCookies(authResponse, errorResponse);
    }

    // Type assertion to resolve GenericStringError union
    const note = data as unknown as Record<string, unknown>;

    // Transform response
    const transformedNote = {
      id: note.id,
      ...(profile.role === 'coach' && 'client_id' in note && note.client_id ? { clientId: note.client_id } : {}),
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

    const successResponse = NextResponse.json({ data: transformedNote });
    return propagateCookies(authResponse, successResponse);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error in note PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const params = await context.params;
  try {
    const { id } = params;
    const { client: supabase, response: authResponse } = createAuthenticatedSupabaseClient(
      request,
      new NextResponse()
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      const errorResponse = createErrorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED);
      return propagateCookies(authResponse, errorResponse);
    }

    // Get user profile to determine role
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      const errorResponse = createErrorResponse('User not found', HTTP_STATUS.NOT_FOUND);
      return propagateCookies(authResponse, errorResponse);
    }

    // Determine table and owner field based on user role
    const tableName = profile.role === 'coach' ? 'coach_notes' : 'client_notes';
    const ownerField = profile.role === 'coach' ? 'coach_id' : 'client_id';

    // Verify note exists and belongs to user
    const { data: existingNote, error: fetchError } = await supabase
      .from(tableName)
      .select('id')
      .eq('id', id)
      .eq(ownerField, user.id)
      .single();

    if (fetchError || !existingNote) {
      const errorResponse = createErrorResponse('Note not found', HTTP_STATUS.NOT_FOUND);
      return propagateCookies(authResponse, errorResponse);
    }

    // Delete note
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id)
      .eq(ownerField, user.id);

    if (error) {
      console.error('Error deleting note:', error);
      const errorResponse = createErrorResponse('Failed to delete note', HTTP_STATUS.INTERNAL_SERVER_ERROR);
      return propagateCookies(authResponse, errorResponse);
    }

    const successResponse = NextResponse.json({ message: 'Note deleted successfully' });
    return propagateCookies(authResponse, successResponse);
  } catch (error) {
    console.error('Error in note DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}