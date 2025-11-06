import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getAuthenticatedUser } from '@/lib/api/authenticated-request';
import { ApiError } from '@/lib/api/errors';
import { ApiResponseHelper } from '@/lib/api/types';
import { rateLimit } from '@/lib/security/rate-limit';
import { analyticsService } from '@/lib/services/analytics-service';
import { logger } from '@/lib/logger';


const analyticsQuerySchema = z.object({
  timeRange: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
});

// Apply rate limiting for admin analytics to prevent abuse
const rateLimitedHandler = rateLimit(30, 60000)( // 30 requests per minute for admin analytics
  async (request: NextRequest): Promise<NextResponse> => {
  try {
    // Verify admin access from Authorization header
    const user = await getAuthenticatedUser(request);
    if (!user || user.role !== 'admin') {
      return ApiResponseHelper.forbidden('Admin access required');
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      timeRange: searchParams.get('timeRange') || '30d',
    };

    const validation = analyticsQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return ApiResponseHelper.badRequest('Invalid query parameters');
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

    // Fetch analytics data with robust error handling
    const results = await Promise.allSettled([
      analyticsService.getOverview(startDate, endDate),
      analyticsService.getUserGrowth(startDate, endDate),
      analyticsService.getSessionMetrics(startDate, endDate),
      analyticsService.getCoachPerformance(startDate, endDate),
    ]);

    // Handle partial failures gracefully
    const overview = results[0].status === 'fulfilled' ? results[0].value : {
      totalUsers: 0, activeUsers: 0, totalSessions: 0, completedSessions: 0,
      revenue: 0, averageRating: 0
    };
    
    const userGrowth = results[1].status === 'fulfilled' ? results[1].value : [];
    const sessionMetrics = results[2].status === 'fulfilled' ? results[2].value : [];
    const coachPerformance = results[3].status === 'fulfilled' ? results[3].value : [];

    // Log any failures for monitoring
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const operation = ['overview', 'userGrowth', 'sessionMetrics', 'coachPerformance'][index];
        logger.error(`Analytics API - Failed to fetch ${operation}:`, result.reason);
      }
    });

    const analyticsData = {
      overview,
      userGrowth,
      sessionMetrics,
      coachPerformance,
      timeRange,
      generatedAt: new Date().toISOString(),
    };

    return ApiResponseHelper.success(analyticsData);

  } catch (error) {
    logger.error('Analytics API error:', error);
    
    if (error instanceof ApiError) {
      return ApiResponseHelper.error(error.code, error.message);
    }
    
    return ApiResponseHelper.internalError('Failed to fetch analytics data');
  }
  }
);

export async function GET(request: NextRequest): Promise<Response> {
  return rateLimitedHandler(request);
}