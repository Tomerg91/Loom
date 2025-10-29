import { NextRequest } from 'next/server';
import { z } from 'zod';

import { getAuthenticatedUser } from '@/lib/api/authenticated-request';
import { ApiError } from '@/lib/api/errors';
import { ApiResponseHelper } from '@/lib/api/types';
import { adminAnalyticsService } from '@/lib/database/admin-analytics';


const dashboardQuerySchema = z.object({
  timeRange: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
  includeDetails: z.boolean().default(false),
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
      timeRange: searchParams.get('timeRange') || '30d',
      includeDetails: searchParams.get('includeDetails') === 'true',
    };

    const validation = dashboardQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return ApiResponseHelper.badRequest('Invalid query parameters');
    }

    const { timeRange, includeDetails } = validation.data;

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

    // Fetch comprehensive dashboard data
    const [
      overview,
      userAnalytics,
      systemHealth
    ] = await Promise.all([
      adminAnalyticsService.getOverview(startDate, endDate),
      adminAnalyticsService.getUserAnalytics(),
      adminAnalyticsService.getSystemHealth(),
    ]);

    let detailedData = {};
    
    if (includeDetails) {
      const [userGrowth, sessionMetrics, coachPerformance] = await Promise.all([
        adminAnalyticsService.getUserGrowth(startDate, endDate),
        adminAnalyticsService.getSessionMetrics(startDate, endDate),
        adminAnalyticsService.getCoachPerformance(startDate, endDate),
      ]);

      detailedData = {
        userGrowth,
        sessionMetrics,
        coachPerformance,
      };
    }

    const dashboardData = {
      overview,
      userAnalytics,
      systemHealth,
      ...detailedData,
      timeRange,
      generatedAt: new Date().toISOString(),
    };

    return ApiResponseHelper.success(dashboardData);

  } catch (error) {
    console.error('Admin dashboard API error:', error);
    
    if (error instanceof ApiError) {
      return ApiResponseHelper.error(error.code, error.message);
    }
    
    return ApiResponseHelper.internalError('Failed to fetch dashboard data');
  }
}