import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import {
  createSuccessResponse,
  createErrorResponse,
  HTTP_STATUS
} from '@/lib/api/utils';

// Validation schema for query parameters
const auditQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  category: z.enum([
    'profile',
    'notification',
    'display',
    'localization',
    'privacy',
    'accessibility',
    'session',
    'data',
    'security'
  ]).optional(),
});

/**
 * GET /api/settings/audit
 * Retrieves audit history for the authenticated user's settings changes
 * Query parameters:
 *   - limit: Number of records to return (1-100, default: 50)
 *   - offset: Number of records to skip (default: 0)
 *   - category: Filter by setting category (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return createErrorResponse('Unauthorized', HTTP_STATUS.UNAUTHORIZED);
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      category: searchParams.get('category'),
    };

    const validationResult = auditQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return createErrorResponse(
        'Invalid query parameters',
        HTTP_STATUS.BAD_REQUEST,
        validationResult.error.errors
      );
    }

    const { limit, offset, category } = validationResult.data;

    // Call the database function to get audit history
    const { data: auditLogs, error } = await supabase.rpc(
      'get_settings_audit_history',
      {
        input_user_id: user.id,
        limit_count: limit,
        offset_count: offset,
      }
    );

    if (error) {
      console.error('Error fetching audit history:', error);
      return createErrorResponse(
        'Failed to fetch audit history',
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }

    // Filter by category if specified
    let filteredLogs = auditLogs || [];
    if (category) {
      filteredLogs = filteredLogs.filter(
        (log: { setting_category: string }) => log.setting_category === category
      );
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('settings_audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (category) {
      countQuery = countQuery.eq('setting_category', category);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Error counting audit logs:', countError);
    }

    // Transform to API format (camelCase)
    const apiAuditLogs = filteredLogs.map((log: {
      id: string;
      setting_category: string;
      setting_key: string;
      old_value: Record<string, unknown>;
      new_value: Record<string, unknown>;
      change_source: string;
      change_reason?: string;
      created_at: string;
    }) => ({
      id: log.id,
      settingCategory: log.setting_category,
      settingKey: log.setting_key,
      oldValue: log.old_value,
      newValue: log.new_value,
      changeSource: log.change_source,
      changeReason: log.change_reason,
      createdAt: log.created_at,
    }));

    return createSuccessResponse({
      logs: apiAuditLogs,
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: (offset + limit) < (count || 0),
      },
    });

  } catch (error) {
    console.error('Settings audit GET error:', error);
    return createErrorResponse(
      'Internal server error',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}
