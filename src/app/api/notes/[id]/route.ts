import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateNoteSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  content: z.string().min(1).max(2000).optional(),
  privacyLevel: z.enum(['private', 'shared_with_client']).optional(),
  tags: z.array(z.string()).optional(),
});

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: note, error } = await supabase
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
      .eq('id', id)
      .eq('coach_id', user.id)
      .single();

    if (error || !note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
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

    return NextResponse.json({ data: transformedNote });
  } catch (error) {
    console.error('Error in note GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateNoteSchema.parse(body);

    // Verify note exists and belongs to user
    const { data: existingNote, error: fetchError } = await supabase
      .from('coach_notes')
      .select('id, coach_id')
      .eq('id', id)
      .eq('coach_id', user.id)
      .single();

    if (fetchError || !existingNote) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Update note
    const { data: note, error } = await supabase
      .from('coach_notes')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('coach_id', user.id)
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
      .single();

    if (error) {
      console.error('Error updating note:', error);
      return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
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

    return NextResponse.json({ data: transformedNote });
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

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify note exists and belongs to user
    const { data: existingNote, error: fetchError } = await supabase
      .from('coach_notes')
      .select('id')
      .eq('id', id)
      .eq('coach_id', user.id)
      .single();

    if (fetchError || !existingNote) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Delete note
    const { error } = await supabase
      .from('coach_notes')
      .delete()
      .eq('id', id)
      .eq('coach_id', user.id);

    if (error) {
      console.error('Error deleting note:', error);
      return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Error in note DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}