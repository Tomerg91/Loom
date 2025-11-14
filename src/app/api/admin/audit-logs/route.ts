import { NextRequest } from 'next/server';
import { z } from 'zod';

import { getAuthenticatedUser } from '@/lib/api/authenticated-request';
import { ApiError } from '@/lib/api/errors';
import { ApiResponseHelper } from '@/lib/api/types';
import { getMfaAuditLogs } from '@/lib/auth/mfa-telemetry';
import { getAuthAuditLogs } from '@/lib/auth/auth-telemetry';
import { createAdminClient } from '@/modules/platform/supabase/server';

const auditQuerySchema = z.object({
  type: z.enum(['auth', 'mfa', 'all']).default('all'),
  userId: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(500).default(100),
  offset: z.coerce.number().min(0).default(0),
  eventTypes: z.string().optional(), // Comma-separated list
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  dateRange: z.enum(['1d', '7d', '30d', '90d']).optional(),
});

export async function GET(request: NextRequest): Promise<Response> {
  try {
    // Verify admin access
    const user = await getAuthenticatedUser(request);
    if (!user || user.role !== 'admin') {
      return ApiResponseHelper.forbidden('Admin access required');
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      type: searchParams.get('type') || 'all',
      userId: searchParams.get('userId') || undefined,
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
      eventTypes: searchParams.get('eventTypes') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      dateRange: searchParams.get('dateRange') || undefined,
    };

    const validation = auditQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return ApiResponseHelper.badRequest('Invalid query parameters', {
        errors: validation.error.flatten().fieldErrors
      });
    }

    const { type, userId, limit, offset, eventTypes, startDate, endDate, dateRange } = validation.data;

    // Calculate date range if provided
    let calculatedStartDate: Date | undefined;
    let calculatedEndDate: Date | undefined;

    if (dateRange) {
      calculatedEndDate = new Date();
      calculatedStartDate = new Date();

      switch (dateRange) {
        case '1d':
          calculatedStartDate.setDate(calculatedStartDate.getDate() - 1);
          break;
        case '7d':
          calculatedStartDate.setDate(calculatedStartDate.getDate() - 7);
          break;
        case '30d':
          calculatedStartDate.setDate(calculatedStartDate.getDate() - 30);
          break;
        case '90d':
          calculatedStartDate.setDate(calculatedStartDate.getDate() - 90);
          break;
      }
    } else {
      calculatedStartDate = startDate ? new Date(startDate) : undefined;
      calculatedEndDate = endDate ? new Date(endDate) : undefined;
    }

    // Parse event types if provided
    const parsedEventTypes = eventTypes ? eventTypes.split(',') : undefined;

    // Fetch logs based on type
    let authLogs: any[] = [];
    let mfaLogs: any[] = [];

    if (type === 'auth' || type === 'all') {
      authLogs = await getAuthAuditLogs({
        userId,
        limit: type === 'all' ? Math.ceil(limit / 2) : limit,
        offset,
        eventTypes: parsedEventTypes as any,
        startDate: calculatedStartDate,
        endDate: calculatedEndDate,
      });
    }

    if (type === 'mfa' || type === 'all') {
      // If userId is provided, fetch for that user; otherwise fetch all (admin view)
      if (userId) {
        mfaLogs = await getMfaAuditLogs(userId, {
          limit: type === 'all' ? Math.ceil(limit / 2) : limit,
          offset,
          eventTypes: parsedEventTypes as any,
          startDate: calculatedStartDate,
          endDate: calculatedEndDate,
        });
      } else {
        // Fetch all MFA logs for admin view
        const supabase = createAdminClient();
        let query = supabase
          .from('mfa_audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .range(offset, offset + (type === 'all' ? Math.ceil(limit / 2) : limit) - 1);

        if (parsedEventTypes && parsedEventTypes.length > 0) {
          query = query.in('event_type', parsedEventTypes);
        }

        if (calculatedStartDate) {
          query = query.gte('created_at', calculatedStartDate.toISOString());
        }

        if (calculatedEndDate) {
          query = query.lte('created_at', calculatedEndDate.toISOString());
        }

        const { data, error } = await query;

        if (error) {
          console.error('Failed to fetch MFA audit logs:', error);
        } else {
          mfaLogs = data || [];
        }
      }
    }

    // Combine and format logs
    const combinedLogs = [
      ...authLogs.map(log => ({
        ...log,
        log_type: 'auth',
        action: log.event_type,
        resource_type: 'authentication',
        user_email: log.user_id ? 'User' : 'System', // We'll fetch actual emails below
        user_role: 'unknown',
        severity: log.success ? 'info' : 'error',
        metadata: {
          ...log.event_data,
          success: log.success,
          error_message: log.error_message,
        }
      })),
      ...mfaLogs.map(log => ({
        ...log,
        log_type: 'mfa',
        action: log.event_type,
        resource_type: 'mfa',
        user_email: 'User', // We'll fetch actual emails below
        user_role: 'unknown',
        severity: log.success ? 'info' : 'error',
        metadata: {
          ...log.event_data,
          success: log.success,
          error_message: log.error_message,
        }
      }))
    ];

    // Sort by created_at descending
    combinedLogs.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Limit to requested count
    const limitedLogs = combinedLogs.slice(0, limit);

    // Fetch user details for the logs
    const userIds = [...new Set(limitedLogs.map(log => log.user_id).filter(Boolean))] as string[];

    if (userIds.length > 0) {
      const supabase = createAdminClient();
      const { data: users } = await supabase
        .from('users')
        .select('id, email, role')
        .in('id', userIds);

      const userMap = new Map(users?.map(u => [u.id, u]) || []);

      limitedLogs.forEach(log => {
        if (log.user_id) {
          const userInfo = userMap.get(log.user_id);
          if (userInfo) {
            log.user_email = userInfo.email || 'Unknown';
            log.user_role = userInfo.role || 'unknown';
          }
        }
      });
    }

    // Calculate total items (approximate for combined view)
    const totalItems = type === 'all'
      ? Math.max(authLogs.length + mfaLogs.length, limitedLogs.length)
      : type === 'auth'
      ? authLogs.length
      : mfaLogs.length;

    const response = {
      logs: limitedLogs,
      pagination: {
        page: Math.floor(offset / limit) + 1,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
      filters: {
        type,
        userId,
        eventTypes: parsedEventTypes,
        startDate: calculatedStartDate?.toISOString(),
        endDate: calculatedEndDate?.toISOString(),
      }
    };

    return ApiResponseHelper.success(response);

  } catch (error) {
    console.error('Audit logs API error:', error);

    if (error instanceof ApiError) {
      return ApiResponseHelper.error(error.code, error.message);
    }

    return ApiResponseHelper.internalError('Failed to fetch audit logs');
  }
}

// Export endpoint for CSV
export async function POST(request: NextRequest): Promise<Response> {
  try {
    // Verify admin access
    const user = await getAuthenticatedUser(request);
    if (!user || user.role !== 'admin') {
      return ApiResponseHelper.forbidden('Admin access required');
    }

    // Get logs using same logic as GET
    const { searchParams } = new URL(request.url);

    // Reuse GET logic but with higher limits for export
    searchParams.set('limit', '10000');

    const getRequest = new NextRequest(request.url, { method: 'GET' });
    const getResponse = await GET(getRequest);

    const data = await getResponse.json();

    if (!data.success) {
      return getResponse;
    }

    // Convert to CSV
    const logs = data.data.logs;

    if (logs.length === 0) {
      return new Response('No logs to export', { status: 404 });
    }

    const headers = [
      'Date/Time',
      'Type',
      'Event',
      'User Email',
      'User Role',
      'IP Address',
      'Success',
      'Error Message',
      'Metadata'
    ];

    const csvRows = [headers.join(',')];

    logs.forEach((log: any) => {
      const row = [
        new Date(log.created_at).toLocaleString(),
        log.log_type,
        log.event_type,
        log.user_email || '',
        log.user_role || '',
        log.ip_address || '',
        log.success ? 'Yes' : 'No',
        log.error_message || '',
        JSON.stringify(log.metadata || {}).replace(/,/g, ';') // Replace commas to avoid CSV issues
      ];
      csvRows.push(row.map(field => `"${field}"`).join(','));
    });

    const csv = csvRows.join('\n');

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString()}.csv"`
      }
    });

  } catch (error) {
    console.error('Audit logs export error:', error);
    return ApiResponseHelper.internalError('Failed to export audit logs');
  }
}
