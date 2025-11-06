import { NextRequest, NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';

export async function GET(_request: NextRequest) {
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

    // Determine table and owner field based on user role
    const tableName = profile.role === 'coach' ? 'coach_notes' : 'client_notes';
    const ownerField = profile.role === 'coach' ? 'coach_id' : 'client_id';

    // Fetch all unique tags from user's notes
    const { data: notes, error } = await supabase
      .from(tableName)
      .select('tags')
      .eq(ownerField, user.id)
      .not('tags', 'is', null);

    if (error) {
      console.error('Error fetching tags:', error);
      return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
    }

    // Extract and flatten all tags
    const allTags = new Set<string>();
    notes?.forEach(note => {
      if (note.tags && Array.isArray(note.tags)) {
        note.tags.forEach(tag => {
          if (tag && typeof tag === 'string' && tag.trim()) {
            allTags.add(tag.trim());
          }
        });
      }
    });

    // Convert to sorted array
    const uniqueTags = Array.from(allTags).sort();

    return NextResponse.json({
      data: uniqueTags,
      count: uniqueTags.length
    });
  } catch (error) {
    console.error('Error in tags GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}