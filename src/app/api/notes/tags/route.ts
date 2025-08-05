import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all unique tags from coach's notes
    const { data: notes, error } = await supabase
      .from('coach_notes')
      .select('tags')
      .eq('coach_id', user.id)
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