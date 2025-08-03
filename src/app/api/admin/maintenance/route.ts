import { NextRequest } from 'next/server';
import { authService } from '@/lib/services/auth-service';
import { adminSystemService } from '@/lib/database/admin-system';
import { ApiResponseHelper } from '@/lib/api/types';
import { ApiError } from '@/lib/api/errors';
import { z } from 'zod';

const maintenanceActionSchema = z.object({
  action: z.enum(['backup_database', 'clear_cache', 'export_logs', 'clean_temp_files']),
});

export async function POST(request: NextRequest): Promise<Response> {
  try {
    // Verify admin access
    const session = await authService.getSession();
    if (!session?.user || session.user.role !== 'admin') {
      return ApiResponseHelper.forbidden('Admin access required');
    }

    // Parse request body
    const body = await request.json();
    const validation = maintenanceActionSchema.safeParse(body);
    
    if (!validation.success) {
      return ApiResponseHelper.badRequest('Invalid maintenance action');
    }

    const { action } = validation.data;

    // Perform maintenance action
    const result = await adminSystemService.performMaintenanceAction(action);

    if (!result.success) {
      return ApiResponseHelper.error('MAINTENANCE_FAILED', result.message, 500);
    }

    // Log the maintenance action (in a real implementation, this would create an audit log entry)
    console.log(`Admin ${session.user.email} performed maintenance action: ${action}`);

    return ApiResponseHelper.success({
      action,
      message: result.message,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Maintenance action API error:', error);
    
    if (error instanceof ApiError) {
      return ApiResponseHelper.error(error.code, error.message);
    }
    
    return ApiResponseHelper.internalError('Failed to perform maintenance action');
  }
}