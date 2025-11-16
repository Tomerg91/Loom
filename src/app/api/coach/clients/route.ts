import { NextRequest, NextResponse } from 'next/server';

import { ApiError } from '@/lib/api/errors';
import { ApiResponseHelper } from '@/lib/api/types';
import { createClient } from '@/lib/supabase/server';
import { queryMonitor } from '@/lib/performance/query-monitoring';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  lastSession?: string;
  totalSessions: number;
  status: 'active' | 'inactive' | 'pending';
  joinedDate: string;
  nextSession?: string;
  completedSessions: number;
  averageRating: number;
  goals?: string[];
  progress: {
    current: number;
    target: number;
  };
}

export async function GET(request: NextRequest): Promise<Response> {
  try {
    // Use cookie-based authentication (same as sessions endpoint)
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    console.log('[/api/coach/clients] Auth check:', {
      hasUser: !!user,
      userId: user?.id,
      authError: authError?.message,
      timestamp: new Date().toISOString()
    });

    if (authError || !user) {
      console.error('[/api/coach/clients] Authentication failed:', authError);
      return ApiResponseHelper.unauthorized('Authentication required');
    }

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('[/api/coach/clients] Failed to fetch user profile:', profileError);
      return ApiResponseHelper.unauthorized('User profile not found');
    }

    if (profile.role !== 'coach') {
      console.error('[/api/coach/clients] User is not a coach:', {
        userId: user.id,
        role: profile.role
      });
      return ApiResponseHelper.forbidden(`Coach access required. Current role: ${profile.role}`);
    }

    const coachId = user.id;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const search = searchParams.get('search') || null;
    const statusFilter = searchParams.get('status') || 'all';
    const sortBy = searchParams.get('sortBy') || 'name';

    console.log('[/api/coach/clients] Fetching clients for coach:', coachId, {
      limit,
      offset,
      search,
      statusFilter,
      sortBy
    });

    // Use the new RPC function for optimized, paginated client data
    const { data: clientsData, error } = await queryMonitor.trackQueryExecution(
      'Coach Clients RPC',
      async () => {
        return await supabase.rpc('get_coach_clients_paginated', {
          p_coach_id: coachId,
          p_limit: limit,
          p_offset: offset,
          p_search: search,
          p_status_filter: statusFilter,
          p_sort_by: sortBy
        });
      }
    );

    if (error) {
      console.error('[/api/coach/clients] Error fetching clients:', error);
      throw new ApiError('FETCH_CLIENTS_FAILED', 'Failed to fetch clients', 500);
    }

    // Transform RPC results to match the expected Client interface
    const clients: Client[] = (clientsData || []).map((row: any) => ({
      id: row.client_id,
      firstName: row.first_name || '',
      lastName: row.last_name || '',
      email: row.email || '',
      phone: row.phone || undefined,
      avatar: row.avatar_url || undefined,
      lastSession: row.last_session || undefined,
      totalSessions: Number(row.total_sessions) || 0,
      status: row.status as 'active' | 'inactive' | 'pending',
      joinedDate: row.joined_date || new Date().toISOString(),
      nextSession: row.next_session || undefined,
      completedSessions: Number(row.completed_sessions) || 0,
      averageRating: Number(row.average_rating) || 0,
      goals: row.goals || [],
      progress: {
        current: Number(row.progress_current) || 0,
        target: Number(row.progress_target) || 1,
      },
    }));

    // Extract total count from first row (all rows have the same count)
    const totalCount = clientsData && clientsData.length > 0
      ? Number(clientsData[0].total_count)
      : 0;

    const pagination = {
      total: totalCount,
      limit,
      offset,
      hasMore: offset + clients.length < totalCount,
    };

    console.log('[/api/coach/clients] Returning clients:', {
      count: clients.length,
      totalCount,
      offset,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: clients,
      pagination,
    });

  } catch (error) {
    console.error('Coach clients API error:', error);

    if (error instanceof ApiError) {
      return ApiResponseHelper.error(error.code, error.message, error.statusCode);
    }

    return ApiResponseHelper.internalError('Failed to fetch coach clients');
  }
}