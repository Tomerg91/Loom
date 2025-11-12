/**
 * Analytics Dashboard API
 * Comprehensive endpoint for fetching analytics data for goals G1-G4
 */

import { NextRequest } from 'next/server';
import {
  createSuccessResponse,
  createErrorResponse,
  withErrorHandling,
  HTTP_STATUS,
  rateLimit,
  withRequestLogging,
  requireAuth,
} from '@/lib/api/utils';
import { createClient } from '@/lib/supabase/server';
import type {
  AnalyticsSummary,
  FunnelMetrics,
  CoachProductivitySummary,
  ClientEngagementSummary,
  ServiceUptimeMetrics,
} from '@/types/analytics';
import {
  CRITICAL_SERVICES,
  getServiceUptimeMetrics,
} from '@/lib/monitoring/uptime-monitoring';

// Rate limit: 60 requests per minute for analytics
const rateLimitedHandler = rateLimit(60, 60_000);

/**
 * GET /api/analytics/dashboard
 * Get comprehensive analytics dashboard data
 */
export const GET = withErrorHandling(
  withRequestLogging(
    rateLimitedHandler(
      requireAuth(async (user, request: NextRequest) => {
        // Only admins can access analytics dashboard
        if (user.role !== 'admin') {
          return createErrorResponse(
            'Admin access required',
            HTTP_STATUS.FORBIDDEN
          );
        }

        const searchParams = request.nextUrl.searchParams;
        const startDate = searchParams.get('startDate') || getDefaultStartDate();
        const endDate = searchParams.get('endDate') || getDefaultEndDate();

        const supabase = await createClient();

        // Fetch all analytics data in parallel
        const [
          funnelMetrics,
          coachProductivity,
          clientEngagement,
          goalMetrics,
          uptimeMetrics,
        ] = await Promise.all([
          getFunnelMetrics(supabase, startDate, endDate),
          getCoachProductivityMetrics(supabase, startDate, endDate),
          getClientEngagementMetrics(supabase, startDate, endDate),
          getGoalCompletionMetrics(supabase, startDate, endDate),
          getUptimeMetricsForAllServices(startDate, endDate),
        ]);

        // Build comprehensive summary
        const summary: AnalyticsSummary = {
          startDate,
          endDate,

          // User metrics
          totalUsers: funnelMetrics.totalSignups,
          activeUsers: clientEngagement.totalActive,
          newUsers: funnelMetrics.newSignups,
          weeklyActiveClients: clientEngagement.weeklyActive,

          // Session metrics
          totalSessions: coachProductivity.totalSessions,
          completedSessions: coachProductivity.completedSessions,
          sessionCompletionRate: coachProductivity.avgCompletionRate,
          avgSessionDuration: coachProductivity.avgSessionDuration,

          // Goal metrics
          totalGoals: goalMetrics.totalGoals,
          activeGoals: goalMetrics.activeGoals,
          completedGoals: goalMetrics.completedGoals,
          goalCompletionRate: goalMetrics.completionRate,

          // Engagement metrics
          avgEngagementScore: clientEngagement.avgEngagementScore,
          avgTaskCompletionRate: clientEngagement.avgTaskCompletionRate,
          resourceViewCount: clientEngagement.totalResourceViews,

          // Coach metrics
          activeCoaches: coachProductivity.activeCoaches,
          avgCoachProductivityScore: coachProductivity.avgProductivityScore,
          avgSessionsPerCoach: coachProductivity.avgSessionsPerCoach,
        };

        return createSuccessResponse({
          summary,
          funnelMetrics,
          coachProductivity: coachProductivity.coaches,
          clientEngagement: clientEngagement.clients,
          goalMetrics,
          uptimeMetrics,
        });
      })
    ),
    { name: 'GET /api/analytics/dashboard' }
  )
);

// =====================================================================
// HELPER FUNCTIONS
// =====================================================================

function getDefaultStartDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 30); // Last 30 days
  return date.toISOString();
}

function getDefaultEndDate(): string {
  return new Date().toISOString();
}

async function getFunnelMetrics(
  supabase: any,
  startDate: string,
  endDate: string
): Promise<FunnelMetrics> {
  // Call database function for funnel metrics
  const { data, error } = await supabase.rpc('get_onboarding_funnel_metrics', {
    start_date: startDate,
    end_date: endDate,
  });

  if (error) {
    console.error('Error fetching funnel metrics:', error);
    return {
      startDate,
      endDate,
      totalSignups: 0,
      onboardingCompletionRate: 0,
      steps: [],
      avgOnboardingTime: 0,
    };
  }

  const totalSignups =
    data.find((d: any) => d.step === 'signup_completed')?.users_reached || 0;
  const totalCompleted =
    data.find((d: any) => d.step === 'onboarding_completed')?.users_reached || 0;
  const onboardingCompletionRate =
    totalSignups > 0 ? (totalCompleted / totalSignups) * 100 : 0;

  return {
    startDate,
    endDate,
    totalSignups,
    onboardingCompletionRate,
    steps: data.map((d: any) => ({
      step: d.step,
      usersReached: d.users_reached,
      completionPercentage: d.completion_percentage,
    })),
    avgOnboardingTime: 24, // TODO: Calculate from actual data
  };
}

async function getCoachProductivityMetrics(
  supabase: any,
  startDate: string,
  endDate: string
): Promise<{
  activeCoaches: number;
  avgProductivityScore: number;
  avgSessionsPerCoach: number;
  totalSessions: number;
  completedSessions: number;
  avgCompletionRate: number;
  avgSessionDuration: number;
  coaches: CoachProductivitySummary[];
}> {
  const { data, error } = await supabase.rpc(
    'get_coach_productivity_summary',
    {
      p_coach_id: null,
      start_date: startDate.split('T')[0],
      end_date: endDate.split('T')[0],
    }
  );

  if (error) {
    console.error('Error fetching coach productivity:', error);
    return {
      activeCoaches: 0,
      avgProductivityScore: 0,
      avgSessionsPerCoach: 0,
      totalSessions: 0,
      completedSessions: 0,
      avgCompletionRate: 0,
      avgSessionDuration: 0,
      coaches: [],
    };
  }

  const coaches: CoachProductivitySummary[] = data.map((d: any, index: number) => ({
    coachId: d.coach_id,
    coachName: d.coach_name,
    totalSessions: d.total_sessions,
    sessionsCompleted: d.sessions_completed,
    completionRate: d.completion_rate,
    tasksCreated: d.tasks_created,
    resourcesShared: d.resources_shared,
    activeClients: d.active_clients,
    avgProductivityScore: d.avg_productivity_score,
    performanceRank: index + 1,
  }));

  const totalSessions = coaches.reduce(
    (sum, c) => sum + c.totalSessions,
    0
  );
  const completedSessions = coaches.reduce(
    (sum, c) => sum + c.sessionsCompleted,
    0
  );

  return {
    activeCoaches: coaches.length,
    avgProductivityScore:
      coaches.reduce((sum, c) => sum + c.avgProductivityScore, 0) /
        coaches.length || 0,
    avgSessionsPerCoach: totalSessions / coaches.length || 0,
    totalSessions,
    completedSessions,
    avgCompletionRate:
      coaches.reduce((sum, c) => sum + c.completionRate, 0) / coaches.length || 0,
    avgSessionDuration: 60, // TODO: Calculate from actual session data
    coaches,
  };
}

async function getClientEngagementMetrics(
  supabase: any,
  startDate: string,
  endDate: string
): Promise<{
  totalActive: number;
  weeklyActive: number;
  avgEngagementScore: number;
  avgTaskCompletionRate: number;
  totalResourceViews: number;
  clients: ClientEngagementSummary[];
}> {
  const { data, error } = await supabase.rpc('get_client_engagement_summary', {
    p_client_id: null,
    start_date: startDate.split('T')[0],
    end_date: endDate.split('T')[0],
  });

  if (error) {
    console.error('Error fetching client engagement:', error);
    return {
      totalActive: 0,
      weeklyActive: 0,
      avgEngagementScore: 0,
      avgTaskCompletionRate: 0,
      totalResourceViews: 0,
      clients: [],
    };
  }

  const clients: ClientEngagementSummary[] = data.map((d: any) => ({
    clientId: d.client_id,
    clientName: d.client_name,
    totalSessions: d.total_sessions,
    tasksCompleted: d.tasks_completed,
    goalsUpdated: d.goals_updated,
    resourcesViewed: d.resources_viewed,
    avgEngagementScore: d.avg_engagement_score,
    daysActive: d.days_active,
    isWeeklyActive: d.is_weekly_active,
  }));

  const weeklyActiveCount = clients.filter((c) => c.isWeeklyActive).length;
  const totalResourceViews = clients.reduce(
    (sum, c) => sum + c.resourcesViewed,
    0
  );

  // Calculate average task completion rate
  const avgTaskCompletionRate = 75; // TODO: Calculate from actual task data

  return {
    totalActive: clients.length,
    weeklyActive: weeklyActiveCount,
    avgEngagementScore:
      clients.reduce((sum, c) => sum + c.avgEngagementScore, 0) /
        clients.length || 0,
    avgTaskCompletionRate,
    totalResourceViews,
    clients,
  };
}

async function getGoalCompletionMetrics(
  supabase: any,
  startDate: string,
  endDate: string
) {
  const { data, error } = await supabase.rpc('get_goal_completion_metrics', {
    start_date: startDate,
    end_date: endDate,
  });

  if (error) {
    console.error('Error fetching goal metrics:', error);
    return {
      totalGoals: 0,
      activeGoals: 0,
      completedGoals: 0,
      completionRate: 0,
      avgCompletionDays: 0,
      clientsWithGoals: 0,
    };
  }

  return {
    totalGoals: data[0]?.total_goals || 0,
    activeGoals: data[0]?.active_goals || 0,
    completedGoals: data[0]?.completed_goals || 0,
    completionRate: data[0]?.completion_rate || 0,
    avgCompletionDays: data[0]?.avg_completion_days || 0,
    clientsWithGoals: data[0]?.clients_with_goals || 0,
  };
}

async function getUptimeMetricsForAllServices(
  startDate: string,
  endDate: string
): Promise<Record<string, ServiceUptimeMetrics>> {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const metrics: Record<string, ServiceUptimeMetrics> = {};

  for (const service of CRITICAL_SERVICES) {
    if (service.enabled) {
      try {
        const serviceMetrics = await getServiceUptimeMetrics(
          service.serviceName,
          start,
          end
        );
        metrics[service.serviceName] = serviceMetrics;
      } catch (error) {
        console.error(
          `Error fetching uptime for ${service.serviceName}:`,
          error
        );
      }
    }
  }

  return metrics;
}
