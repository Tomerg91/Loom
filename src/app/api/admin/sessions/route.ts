import { NextRequest } from 'next/server';
import { authService } from '@/lib/services/auth-service';
import { ApiResponseHelper } from '@/lib/api/types';
import { ApiError } from '@/lib/api/errors';
import { createServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

const getSessionsQuerySchema = z.object({
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled']).optional(),
  coachId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(['scheduled_at', 'created_at', 'updated_at']).default('scheduled_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export async function GET(request: NextRequest): Promise<Response> {
  try {
    // Verify admin access
    const session = await authService.getSession();
    if (!session?.user || session.user.role !== 'admin') {
      return ApiResponseHelper.forbidden('Admin access required');
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      status: searchParams.get('status') || undefined,
      coachId: searchParams.get('coachId') || undefined,
      clientId: searchParams.get('clientId') || undefined,
      fromDate: searchParams.get('fromDate') || undefined,
      toDate: searchParams.get('toDate') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: searchParams.get('sortOrder') || undefined,
    };

    const validation = getSessionsQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return ApiResponseHelper.badRequest('Invalid query parameters', validation.error.errors);
    }

    const { status, coachId, clientId, fromDate, toDate, page, limit, sortBy, sortOrder } = validation.data;

    // Create Supabase client
    const supabase = await createServerClient();

    // Build query
    let query = supabase
      .from('sessions')
      .select(`
        *,
        coach:coach_id(id, email, first_name, last_name, avatar_url),
        client:client_id(id, email, first_name, last_name, avatar_url)
      `, { count: 'exact' });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (coachId) {
      query = query.eq('coach_id', coachId);
    }
    if (clientId) {
      query = query.eq('client_id', clientId);
    }
    if (fromDate) {
      query = query.gte('scheduled_at', fromDate);
    }
    if (toDate) {
      query = query.lte('scheduled_at', toDate);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: sessions, error, count } = await query;

    if (error) {
      console.error('Database error fetching sessions:', error);
      throw new ApiError('DATABASE_ERROR', 'Failed to fetch sessions');
    }

    // Calculate pagination metadata
    const totalPages = count ? Math.ceil(count / limit) : 0;

    return ApiResponseHelper.success({
      sessions: sessions || [],
      pagination: {
        page,
        limit,
        totalItems: count || 0,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });

  } catch (error) {
    console.error('Get admin sessions API error:', error);

    if (error instanceof ApiError) {
      return ApiResponseHelper.error(error.code, error.message);
    }

    return ApiResponseHelper.internalError('Failed to fetch sessions');
  }
}
