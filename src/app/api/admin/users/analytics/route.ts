import { NextRequest } from 'next/server';

import { ApiError } from '@/lib/api/errors';
import { ApiResponseHelper } from '@/lib/api/types';
import { adminAnalyticsService } from '@/lib/database/admin-analytics';
import { authService } from '@/lib/services/auth-service';

export async function GET(_request: NextRequest): Promise<Response> {
  try {
    // Verify admin access
    const session = await authService.getSession();
    if (!session?.user || session.user.role !== 'admin') {
      return ApiResponseHelper.forbidden('Admin access required');
    }

    // Get comprehensive user analytics
    const userAnalytics = await adminAnalyticsService.getUserAnalytics();

    return ApiResponseHelper.success(userAnalytics);

  } catch (error) {
    console.error('User analytics API error:', error);
    
    if (error instanceof ApiError) {
      return ApiResponseHelper.error(error.code, error.message);
    }
    
    return ApiResponseHelper.internalError('Failed to fetch user analytics data');
  }
}