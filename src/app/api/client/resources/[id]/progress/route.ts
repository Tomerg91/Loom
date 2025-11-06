import { NextRequest, NextResponse } from 'next/server';

import {
  markResourceAsViewed,
  markResourceAsCompleted,
} from '@/lib/database/resources';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/client/resources/[id]/progress
 * Update progress for a resource assignment (mark as viewed or completed)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assignmentId } = await params;
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify client role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'client') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { action } = body; // 'viewed' or 'completed'

    if (!action || !['viewed', 'completed'].includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid action. Must be "viewed" or "completed"',
        },
        { status: 400 }
      );
    }

    // Update progress
    if (action === 'viewed') {
      await markResourceAsViewed(assignmentId, user.id);
    } else if (action === 'completed') {
      await markResourceAsCompleted(assignmentId, user.id);
    }

    return NextResponse.json({
      success: true,
      message: `Resource marked as ${action}`,
    });
  } catch (error) {
    logger.error('Failed to update resource progress', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update progress',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
