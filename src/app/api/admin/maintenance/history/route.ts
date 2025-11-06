import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { ApiResponseHelper } from '@/lib/api/types';
import { adminSystemService } from '@/lib/database/admin-system';
import { withAdminSecurity } from '@/lib/security/admin-middleware';
import { createCorsResponse } from '@/lib/security/cors';


const historyQuerySchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 50),
  action: z.string().optional(),
  status: z.string().optional(),
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
});

export const GET = withAdminSecurity(
  async function(
    request: NextRequest,
    _context: { user: any; headers: Record<string, string> }
  ): Promise<NextResponse> {
    try {
      const { searchParams } = new URL(request.url);
      
      // Parse and validate query parameters
      const queryValidation = historyQuerySchema.safeParse({
        limit: searchParams.get('limit'),
        action: searchParams.get('action'),
        status: searchParams.get('status'),
        page: searchParams.get('page'),
      });
      
      if (!queryValidation.success) {
        return ApiResponseHelper.badRequest(
          'Invalid query parameters',
          queryValidation.error.flatten()
        );
      }
      
      const { limit, action, status, page } = queryValidation.data;
      
      // Fetch maintenance history
      const history = await adminSystemService.getMaintenanceHistory(
        limit,
        action,
        status
      );
      
      // Calculate pagination info (simple offset-based pagination)
      const offset = (page - 1) * limit;
      const paginatedHistory = history.slice(offset, offset + limit);
      const totalItems = history.length;
      const totalPages = Math.ceil(totalItems / limit);
      
      // Fetch recent system health stats for context
      const healthStats = await adminSystemService.getSystemHealthStats(24);
      
      return ApiResponseHelper.success({
        history: paginatedHistory,
        pagination: {
          page,
          limit,
          totalItems,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        healthStats,
        filters: {
          action,
          status,
          availableActions: [
            'backup_database',
            'database_health_check',
            'clear_cache',
            'get_cache_stats',
            'export_logs',
            'cleanup_logs',
            'clean_temp_files',
            'system_cleanup',
            'update_configuration',
            'restart_services'
          ],
          availableStatuses: [
            'started',
            'in_progress',
            'completed',
            'failed',
            'partial',
            'cancelled',
            'timeout'
          ]
        }
      });
      
    } catch (error) {
      console.error('Maintenance history API error:', error);
      return ApiResponseHelper.internalError('Failed to fetch maintenance history');
    }
  },
  {
    requireSuperAdmin: false,
    logActivity: true,
    auditAction: 'view_data',
    auditResource: 'maintenance_history'
  }
);

// OPTIONS handler for CORS with security-compliant origin restriction
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return createCorsResponse(request);
}