import { NextRequest, NextResponse } from 'next/server';

import {
  assignResourceToClient,
  unassignResourceFromClient,
  getResourceAssignments,
} from '@/lib/database/resources';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/coach/resources/[id]/assign
 * Assign a resource to one or more clients
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: resourceId } = await params;
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
    const { client_ids, notes } = body;

    if (!client_ids || !Array.isArray(client_ids) || client_ids.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'client_ids array is required',
        },
        { status: 400 }
      );
    }

    // Assign resource to each client
    const assignments = await Promise.all(
      client_ids.map((clientId: string) =>
        assignResourceToClient(resourceId, clientId, user.id, notes)
      )
    );

    return NextResponse.json({
      success: true,
      data: assignments,
      message: `Resource assigned to ${assignments.length} client(s)`,
    }, { status: 201 });
  } catch (error) {
    logger.error('Failed to assign resource', error);

    // Handle unique constraint violation (resource already assigned)
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return NextResponse.json(
        {
          success: false,
          error: 'Resource already assigned to one or more clients',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to assign resource',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/coach/resources/[id]/assign
 * Get all assignments for a resource
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: resourceId } = await params;
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

    // Get assignments
    const assignments = await getResourceAssignments(resourceId, user.id);

    return NextResponse.json({
      success: true,
      data: assignments,
      count: assignments.length,
    });
  } catch (error) {
    logger.error('Failed to fetch resource assignments', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch assignments',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/coach/resources/[id]/assign
 * Unassign a resource from a client
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: resourceId } = await params;
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

    // Parse request body for assignment_id
    const { searchParams } = request.nextUrl;
    const assignmentId = searchParams.get('assignment_id');

    if (!assignmentId) {
      return NextResponse.json(
        {
          success: false,
          error: 'assignment_id query parameter is required',
        },
        { status: 400 }
      );
    }

    // Unassign resource
    await unassignResourceFromClient(assignmentId, user.id);

    return NextResponse.json({
      success: true,
      message: 'Resource unassigned successfully',
    });
  } catch (error) {
    logger.error('Failed to unassign resource', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to unassign resource',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
