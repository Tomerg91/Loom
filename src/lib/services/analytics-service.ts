import { adminAnalyticsService } from '@/lib/database/admin-analytics';

export interface AnalyticsOverview {
  totalUsers: number;
  activeUsers: number;
  totalSessions: number;
  completedSessions: number;
  revenue: number;
  averageRating: number;
}

export interface UserGrowthData {
  date: string;
  newUsers: number;
  activeUsers: number;
}

export interface SessionMetricsData {
  date: string;
  totalSessions: number;
  completedSessions: number;
  cancelledSessions: number;
}

export interface CoachPerformanceData {
  coachId: string;
  coachName: string;
  totalSessions: number;
  averageRating: number;
  revenue: number;
}

class AnalyticsService {
  async getOverview(
    startDate: Date,
    endDate: Date
  ): Promise<AnalyticsOverview> {
    try {
      // Use real database data through admin analytics service
      const overview = await adminAnalyticsService.getOverview(
        startDate,
        endDate
      );

      return {
        totalUsers: overview.totalUsers,
        activeUsers: overview.activeUsers,
        totalSessions: overview.totalSessions,
        completedSessions: overview.completedSessions,
        revenue: overview.revenue,
        averageRating: overview.averageRating,
      };
    } catch (error) {
      console.error('Error fetching overview analytics:', error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        totalSessions: 0,
        completedSessions: 0,
        revenue: 0,
        averageRating: 0,
      };
    }
  }

  async getUserGrowth(
    startDate: Date,
    endDate: Date
  ): Promise<UserGrowthData[]> {
    try {
      // Use real database data
      const userGrowthData = await adminAnalyticsService.getUserGrowth(
        startDate,
        endDate
      );

      return userGrowthData.map(data => ({
        date: data.date,
        newUsers: data.newUsers,
        activeUsers: data.activeUsers,
      }));
    } catch (error) {
      console.error('Error fetching user growth analytics:', error);
      return [];
    }
  }

  async getSessionMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<SessionMetricsData[]> {
    try {
      // Use real database data
      const sessionMetricsData = await adminAnalyticsService.getSessionMetrics(
        startDate,
        endDate
      );

      return sessionMetricsData.map(data => ({
        date: data.date,
        totalSessions: data.totalSessions,
        completedSessions: data.completedSessions,
        cancelledSessions: data.cancelledSessions,
      }));
    } catch (error) {
      console.error('Error fetching session metrics analytics:', error);
      return [];
    }
  }

  async getCoachPerformance(
    startDate: Date,
    endDate: Date
  ): Promise<CoachPerformanceData[]> {
    try {
      // Use real database data
      const coachPerformanceData =
        await adminAnalyticsService.getCoachPerformance(startDate, endDate);

      return coachPerformanceData.map(data => ({
        coachId: data.coachId,
        coachName: data.coachName,
        totalSessions: data.totalSessions,
        averageRating: data.averageRating,
        revenue: data.revenue,
      }));
    } catch (error) {
      console.error('Error fetching coach performance analytics:', error);
      return [];
    }
  }

  async exportAnalyticsData(startDate: Date, endDate: Date): Promise<Blob> {
    try {
      const [overview, userGrowth, sessionMetrics, coachPerformance] =
        await Promise.all([
          this.getOverview(startDate, endDate),
          this.getUserGrowth(startDate, endDate),
          this.getSessionMetrics(startDate, endDate),
          this.getCoachPerformance(startDate, endDate),
        ]);

      const exportData = {
        overview,
        userGrowth,
        sessionMetrics,
        coachPerformance,
        generatedAt: new Date().toISOString(),
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      };

      return new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
    } catch (error) {
      console.error('Error exporting analytics data:', error);
      throw new Error('Failed to export analytics data');
    }
  }
}

export const analyticsService = new AnalyticsService();
