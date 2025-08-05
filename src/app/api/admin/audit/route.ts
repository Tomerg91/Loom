import { NextRequest } from 'next/server';
import { authService } from '@/lib/services/auth-service';
import { adminSystemService } from '@/lib/database/admin-system';
import { ApiResponseHelper } from '@/lib/api/types';
import { ApiError } from '@/lib/api/errors';
import { z } from 'zod';

const auditQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(500).default(50),
  page: z.coerce.number().min(1).default(1),
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
      limit: searchParams.get('limit') || undefined,
      page: searchParams.get('page') || undefined,
    };

    const validation = auditQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return ApiResponseHelper.badRequest('Invalid query parameters');
    }

    const { limit, page } = validation.data;

    // Get audit logs
    const auditLogs = await adminSystemService.getAuditLogs(limit * page);
    
    // Paginate results
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedLogs = auditLogs.slice(startIndex, endIndex);

    const response = {
      logs: paginatedLogs,
      pagination: {
        page,
        limit,
        total: auditLogs.length,
        totalPages: Math.ceil(auditLogs.length / limit),
      },
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