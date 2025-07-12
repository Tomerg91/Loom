import { NextRequest } from 'next/server';
import { authService } from '@/lib/services/auth-service';
import { analyticsService } from '@/lib/services/analytics-service';
import { ApiResponse } from '@/lib/api/types';
import { ApiError } from '@/lib/api/errors';
import { z } from 'zod';

const analyticsQuerySchema = z.object({
  timeRange: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
});

export async function GET(request: NextRequest): Promise<Response> {
  try {
    // Verify admin access
    const session = await authService.getSession();
    if (!session?.user || session.user.role !== 'admin') {
      return ApiResponse.forbidden('Admin access required');
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      timeRange: searchParams.get('timeRange') || '30d',
    };

    const validation = analyticsQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return ApiResponse.badRequest('Invalid query parameters');
    }

    const { timeRange } = validation.data;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }

    // Fetch analytics data
    const [
      overview,
      userGrowth,
      sessionMetrics,
      coachPerformance
    ] = await Promise.all([
      analyticsService.getOverview(startDate, endDate),
      analyticsService.getUserGrowth(startDate, endDate),
      analyticsService.getSessionMetrics(startDate, endDate),
      analyticsService.getCoachPerformance(startDate, endDate),
    ]);

    const analyticsData = {
      overview,
      userGrowth,
      sessionMetrics,
      coachPerformance,
      timeRange,
      generatedAt: new Date().toISOString(),
    };

    return ApiResponse.success(analyticsData);

  } catch (error) {
    console.error('Analytics API error:', error);
    
    if (error instanceof ApiError) {
      return ApiResponse.error(error.code, error.message);
    }
    
    return ApiResponse.internalError('Failed to fetch analytics data');
  }
}