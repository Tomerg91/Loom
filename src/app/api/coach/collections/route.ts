import { NextRequest, NextResponse } from 'next/server';

import { getCoachCollections, createCollection } from '@/lib/database/resources';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/coach/collections
 * Get all collections for the authenticated coach
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify coach role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'coach') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch collections
    const collections = await getCoachCollections(user.id);

    return NextResponse.json({
      success: true,
      data: collections,
    });
  } catch (error) {
    logger.error('Failed to fetch collections:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch collections',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/coach/collections
 * Create a new collection
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify coach role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'coach') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { name, description, icon } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Create collection
    const collection = await createCollection(user.id, name, description, icon);

    return NextResponse.json({
      success: true,
      data: collection,
    });
  } catch (error) {
    logger.error('Failed to create collection:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create collection',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
