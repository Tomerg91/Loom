import { NextRequest } from 'next/server';

import { ApiError } from '@/lib/api/errors';
import { ApiResponseHelper } from '@/lib/api/types';
import { adminAnalyticsService } from '@/lib/database/admin-analytics';
import { authService } from '@/lib/services/auth-service';

export async function GET(request: NextRequest): Promise<Response> {
  try {
    // Verify admin access
    const session = await authService.getSession();
    if (!session?.user || session.user.role !== 'admin') {
      return ApiResponseHelper.forbidden('Admin access required');
    }

    // Get system health data
    const systemHealth = await adminAnalyticsService.getSystemHealth();

    return ApiResponseHelper.success(systemHealth);

  } catch (error) {
    console.error('System health API error:', error);
    
    if (error instanceof ApiError) {
      return ApiResponseHelper.error(error.code, error.message);
    }
    
    return ApiResponseHelper.internalError('Failed to fetch system health data');
  }
}