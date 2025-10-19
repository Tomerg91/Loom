/**
 * Client Resource Progress Tracking API
 *
 * POST /api/client/resources/[resourceId]/progress
 * - Tracks client progress on a resource (viewed, completed, accessed)
 * - Updates resource_client_progress table
 * - Increments analytics counters
 * - RLS enforced: clients can only track their own progress
 *
 * Request Body:
 * {
 *   action: 'viewed' | 'completed' | 'accessed'
 * }
 *
 * @module api/client/resources/[resourceId]/progress
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { TrackProgressRequest } from '@/types/resources';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ resourceId: string }> }
) {
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

    const { resourceId } = await params;

    // Verify user is a client
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('user_metadata')
      .eq('id', user.id)
      .single();

    if (userError || userData?.user_metadata?.role !== 'client') {
      return NextResponse.json({ error: 'Forbidden: Client access only' }, { status: 403 });
    }

    // Verify the resource is shared with this client (RLS will enforce this)
    const { data: resource, error: resourceError } = await supabase
      .from('file_uploads')
      .select('id, is_library_resource')
      .eq('id', resourceId)
      .eq('is_library_resource', true)
      .single();

    if (resourceError || !resource) {
      return NextResponse.json({ error: 'Resource not found or not accessible' }, { status: 404 });
    }

    // Parse request body
    const body: TrackProgressRequest = await request.json();
    const { action } = body;

    if (!action || !['viewed', 'completed', 'accessed'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be "viewed", "completed", or "accessed"' }, { status: 400 });
    }

    // Prepare update data based on action
    const now = new Date().toISOString();
    const updateData: {
      file_id: string;
      client_id: string;
      last_accessed_at: string;
      viewed_at?: string;
      completed_at?: string;
    } = {
      file_id: resourceId,
      client_id: user.id,
      last_accessed_at: now,
    };

    if (action === 'viewed') {
      updateData.viewed_at = now;
    } else if (action === 'completed') {
      updateData.completed_at = now;
      // Also mark as viewed if not already
      updateData.viewed_at = now;
    }

    // Upsert progress record (RLS enforced)
    const { data: existingProgress } = await supabase
      .from('resource_client_progress')
      .select('*')
      .eq('file_id', resourceId)
      .eq('client_id', user.id)
      .single();

    let progressData;

    if (existingProgress) {
      // Update existing record
      const updates: {
        last_accessed_at: string;
        viewed_at?: string;
        completed_at?: string;
        access_count: number;
      } = { last_accessed_at: now, access_count: (existingProgress.access_count || 0) + 1 };

      if (action === 'viewed' && !existingProgress.viewed_at) {
        updates.viewed_at = now;
      }

      if (action === 'completed' && !existingProgress.completed_at) {
        updates.completed_at = now;
        // Mark as viewed if not already
        if (!existingProgress.viewed_at) {
          updates.viewed_at = now;
        }
      }

      const { data, error } = await supabase
        .from('resource_client_progress')
        .update(updates)
        .eq('id', existingProgress.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating progress:', error);
        return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
      }

      progressData = data;
    } else {
      // Create new progress record
      const insertData: {
        file_id: string;
        client_id: string;
        last_accessed_at: string;
        access_count: number;
        viewed_at?: string;
        completed_at?: string;
      } = {
        file_id: resourceId,
        client_id: user.id,
        last_accessed_at: now,
        access_count: 1,
      };

      if (action === 'viewed' || action === 'completed') {
        insertData.viewed_at = now;
      }

      if (action === 'completed') {
        insertData.completed_at = now;
      }

      const { data, error } = await supabase
        .from('resource_client_progress')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error creating progress:', error);
        return NextResponse.json({ error: 'Failed to create progress record' }, { status: 500 });
      }

      progressData = data;
    }

    // Update resource analytics counters
    if (action === 'viewed' && !existingProgress?.viewed_at) {
      await supabase.rpc('increment_resource_view_count', { resource_id: resourceId });
    }

    if (action === 'completed' && !existingProgress?.completed_at) {
      // Use the mark_resource_completed function which updates completion_count
      await supabase.rpc('mark_resource_completed', {
        resource_id: resourceId,
        client_uuid: user.id,
      });
    }

    // Update file_shares access tracking
    const { data: shareData } = await supabase
      .from('file_shares')
      .select('access_count')
      .eq('file_id', resourceId)
      .eq('shared_with', user.id)
      .single();

    if (shareData) {
      await supabase
        .from('file_shares')
        .update({
          access_count: (shareData.access_count || 0) + 1,
          last_accessed_at: now,
        })
        .eq('file_id', resourceId)
        .eq('shared_with', user.id);
    }

    return NextResponse.json({
      success: true,
      data: {
        progress: {
          id: progressData.id,
          fileId: progressData.file_id,
          clientId: progressData.client_id,
          viewedAt: progressData.viewed_at,
          completedAt: progressData.completed_at,
          lastAccessedAt: progressData.last_accessed_at,
          accessCount: progressData.access_count,
        },
      },
    });
  } catch (error) {
    console.error('Error in progress tracking API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
