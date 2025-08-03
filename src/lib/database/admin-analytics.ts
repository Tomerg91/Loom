import { createServerClient } from '@/lib/supabase/server';

export interface AdminAnalyticsOverview {
  totalUsers: number;
  activeUsers: number;
  totalSessions: number;
  completedSessions: number;
  revenue: number;
  averageRating: number;
  newUsersThisMonth: number;
  completionRate: number;
  totalCoaches: number;
  totalClients: number;
  activeCoaches: number;
  averageSessionsPerUser: number;
}

export interface UserGrowthData {
  date: string;
  newUsers: number;
  activeUsers: number;
  totalUsers: number;
}

export interface SessionMetricsData {
  date: string;
  totalSessions: number;
  completedSessions: number;
  cancelledSessions: number;
  scheduledSessions: number;
  completionRate: number;
}

export interface CoachPerformanceData {
  coachId: string;
  coachName: string;
  totalSessions: number;
  completedSessions: number;
  averageRating: number;
  revenue: number;
  activeClients: number;
  completionRate: number;
}

export interface PlatformMetrics {
  overview: AdminAnalyticsOverview;
  userGrowth: UserGrowthData[];
  sessionMetrics: SessionMetricsData[];
  coachPerformance: CoachPerformanceData[];
  timeRange: string;
  generatedAt: string;
}

export interface UserAnalyticsData {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  usersByRole: {
    admin: number;
    coach: number;
    client: number;
  };
  usersByStatus: {
    active: number;
    inactive: number;
    suspended: number;
  };
  recentlyJoined: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    createdAt: string;
  }>;
  topActiveUsers: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    lastSeenAt: string;
    sessionCount: number;
  }>;
}

export interface SystemHealthData {
  database: {
    status: 'healthy' | 'warning' | 'error';
    connections: number;
    maxConnections: number;
    responseTime: number;
    lastBackup: string;
  };
  server: {
    status: 'healthy' | 'warning' | 'error';
    uptime: number;
    memory: {
      used: number;
      total: number;
    };
    cpu: number;
    storage: {
      used: number;
      total: number;
    };
  };
  services: {
    auth: 'online' | 'offline' | 'degraded';
    email: 'online' | 'offline' | 'degraded';
    storage: 'online' | 'offline' | 'degraded';
    notifications: 'online' | 'offline' | 'degraded';
  };
}

class AdminAnalyticsService {
  async getOverview(startDate: Date, endDate: Date): Promise<AdminAnalyticsOverview> {
    try {
      const supabase = createServerClient();

      // Get total users
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Get active users (users who have logged in within the last 30 days)
      const { count: activeUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('last_seen_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      // Get total sessions in date range
      const { count: totalSessions } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .gte('scheduled_at', startDate.toISOString())
        .lte('scheduled_at', endDate.toISOString());

      // Get completed sessions in date range
      const { count: completedSessions } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('scheduled_at', startDate.toISOString())
        .lte('scheduled_at', endDate.toISOString());

      // Get new users this month
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const { count: newUsersThisMonth } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Get coaches and clients count
      const { count: totalCoaches } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'coach');

      const { count: totalClients } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'client');

      // Get active coaches (who have had sessions in the last 30 days)
      const { data: activeCoachesData } = await supabase
        .from('sessions')
        .select('coach_id')
        .gte('scheduled_at', thirtyDaysAgo.toISOString())
        .distinct('coach_id');

      const activeCoaches = activeCoachesData?.length || 0;

      // Calculate metrics
      const completionRate = totalSessions && totalSessions > 0 
        ? Math.round((completedSessions || 0) / totalSessions * 100) 
        : 0;

      const averageSessionsPerUser = totalUsers && totalUsers > 0 
        ? Math.round((totalSessions || 0) / totalUsers * 100) / 100
        : 0;

      // Calculate estimated revenue (assuming $75 per completed session)
      const revenue = (completedSessions || 0) * 75;

      return {
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalSessions: totalSessions || 0,
        completedSessions: completedSessions || 0,
        revenue,
        averageRating: 4.7, // Placeholder - would need a ratings table
        newUsersThisMonth: newUsersThisMonth || 0,
        completionRate,
        totalCoaches: totalCoaches || 0,
        totalClients: totalClients || 0,
        activeCoaches,
        averageSessionsPerUser,
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
        newUsersThisMonth: 0,
        completionRate: 0,
        totalCoaches: 0,
        totalClients: 0,
        activeCoaches: 0,
        averageSessionsPerUser: 0,
      };
    }
  }

  async getUserGrowth(startDate: Date, endDate: Date): Promise<UserGrowthData[]> {
    try {
      const supabase = createServerClient();

      // Generate date range
      const dates = [];
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const userGrowthData: UserGrowthData[] = [];

      for (const date of dates) {
        const dateStr = date.toISOString().split('T')[0];
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        // Get new users for this date
        const { count: newUsers } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', date.toISOString())
          .lt('created_at', nextDate.toISOString());

        // Get total users up to this date
        const { count: totalUsers } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .lte('created_at', nextDate.toISOString());

        // Get active users for this date (users who were seen within 7 days of this date)
        const sevenDaysBefore = new Date(date);
        sevenDaysBefore.setDate(sevenDaysBefore.getDate() - 7);

        const { count: activeUsers } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .gte('last_seen_at', sevenDaysBefore.toISOString())
          .lte('last_seen_at', nextDate.toISOString());

        userGrowthData.push({
          date: dateStr,
          newUsers: newUsers || 0,
          activeUsers: activeUsers || 0,
          totalUsers: totalUsers || 0,
        });
      }

      return userGrowthData;
    } catch (error) {
      console.error('Error fetching user growth analytics:', error);
      return [];
    }
  }

  async getSessionMetrics(startDate: Date, endDate: Date): Promise<SessionMetricsData[]> {
    try {
      const supabase = createServerClient();

      // Generate date range
      const dates = [];
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const sessionMetricsData: SessionMetricsData[] = [];

      for (const date of dates) {
        const dateStr = date.toISOString().split('T')[0];
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        // Get total sessions for this date
        const { count: totalSessions } = await supabase
          .from('sessions')
          .select('*', { count: 'exact', head: true })
          .gte('scheduled_at', date.toISOString())
          .lt('scheduled_at', nextDate.toISOString());

        // Get completed sessions for this date
        const { count: completedSessions } = await supabase
          .from('sessions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completed')
          .gte('scheduled_at', date.toISOString())
          .lt('scheduled_at', nextDate.toISOString());

        // Get cancelled sessions for this date
        const { count: cancelledSessions } = await supabase
          .from('sessions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'cancelled')
          .gte('scheduled_at', date.toISOString())
          .lt('scheduled_at', nextDate.toISOString());

        // Get scheduled sessions for this date
        const { count: scheduledSessions } = await supabase
          .from('sessions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'scheduled')
          .gte('scheduled_at', date.toISOString())
          .lt('scheduled_at', nextDate.toISOString());

        const completionRate = totalSessions && totalSessions > 0 
          ? Math.round((completedSessions || 0) / totalSessions * 100) 
          : 0;

        sessionMetricsData.push({
          date: dateStr,
          totalSessions: totalSessions || 0,
          completedSessions: completedSessions || 0,
          cancelledSessions: cancelledSessions || 0,
          scheduledSessions: scheduledSessions || 0,
          completionRate,
        });
      }

      return sessionMetricsData;
    } catch (error) {
      console.error('Error fetching session metrics analytics:', error);
      return [];
    }
  }

  async getCoachPerformance(startDate: Date, endDate: Date): Promise<CoachPerformanceData[]> {
    try {
      const supabase = createServerClient();

      // Get coach performance with sessions in date range
      const { data: coachData, error } = await supabase
        .from('coach_statistics')
        .select('*');

      if (error) {
        throw error;
      }

      if (!coachData || coachData.length === 0) {
        return [];
      }

      // Get additional metrics for each coach within the date range
      const coachPerformance: CoachPerformanceData[] = [];

      for (const coach of coachData) {
        // Get sessions in date range for this coach
        const { count: totalSessions } = await supabase
          .from('sessions')
          .select('*', { count: 'exact', head: true })
          .eq('coach_id', coach.coach_id)
          .gte('scheduled_at', startDate.toISOString())
          .lte('scheduled_at', endDate.toISOString());

        const { count: completedSessions } = await supabase
          .from('sessions')
          .select('*', { count: 'exact', head: true })
          .eq('coach_id', coach.coach_id)
          .eq('status', 'completed')
          .gte('scheduled_at', startDate.toISOString())
          .lte('scheduled_at', endDate.toISOString());

        // Get unique clients in date range
        const { data: clientsData } = await supabase
          .from('sessions')
          .select('client_id')
          .eq('coach_id', coach.coach_id)
          .gte('scheduled_at', startDate.toISOString())
          .lte('scheduled_at', endDate.toISOString())
          .distinct('client_id');

        const activeClients = clientsData?.length || 0;
        const completionRate = totalSessions && totalSessions > 0 
          ? Math.round((completedSessions || 0) / totalSessions * 100) 
          : 0;

        // Calculate revenue (assuming $75 per completed session)
        const revenue = (completedSessions || 0) * 75;

        coachPerformance.push({
          coachId: coach.coach_id,
          coachName: coach.coach_name || 'Unknown Coach',
          totalSessions: totalSessions || 0,
          completedSessions: completedSessions || 0,
          averageRating: coach.average_rating || 4.5,
          revenue,
          activeClients,
          completionRate,
        });
      }

      // Sort by total sessions descending
      return coachPerformance.sort((a, b) => b.totalSessions - a.totalSessions);
    } catch (error) {
      console.error('Error fetching coach performance analytics:', error);
      return [];
    }
  }

  async getUserAnalytics(): Promise<UserAnalyticsData> {
    try {
      const supabase = createServerClient();

      // Get total users
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Get active users (within last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const { count: activeUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('last_seen_at', thirtyDaysAgo.toISOString());

      // Get new users by time period
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const { count: newUsersToday } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      const { count: newUsersThisWeek } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneWeekAgo.toISOString());

      const { count: newUsersThisMonth } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneMonthAgo.toISOString());

      // Get users by role
      const { count: adminUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin');

      const { count: coachUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'coach');

      const { count: clientUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'client');

      // Get users by status
      const { count: activeUsersStatus } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      const { count: inactiveUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'inactive');

      const { count: suspendedUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'suspended');

      // Get recently joined users
      const { data: recentlyJoined } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, role, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      // Get top active users (with session counts)
      const { data: topActiveUsersData } = await supabase
        .from('users')
        .select(`
          id, email, first_name, last_name, last_seen_at,
          sessions:sessions!client_id(count)
        `)
        .not('last_seen_at', 'is', null)
        .order('last_seen_at', { ascending: false })
        .limit(10);

      const topActiveUsers = topActiveUsersData?.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName || user.first_name || '',
        lastName: user.lastName || user.last_name || '',
        lastSeenAt: user.last_seen_at || '',
        sessionCount: Array.isArray(user.sessions) ? user.sessions.length : 0,
      })) || [];

      return {
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        newUsersToday: newUsersToday || 0,
        newUsersThisWeek: newUsersThisWeek || 0,
        newUsersThisMonth: newUsersThisMonth || 0,
        usersByRole: {
          admin: adminUsers || 0,
          coach: coachUsers || 0,
          client: clientUsers || 0,
        },
        usersByStatus: {
          active: activeUsersStatus || 0,
          inactive: inactiveUsers || 0,
          suspended: suspendedUsers || 0,
        },
        recentlyJoined: recentlyJoined?.map(user => ({
          id: user.id,
          email: user.email,
          firstName: user.firstName || user.first_name || '',
          lastName: user.lastName || user.last_name || '',
          role: user.role,
          createdAt: user.createdAt || user.created_at,
        })) || [],
        topActiveUsers,
      };
    } catch (error) {
      console.error('Error fetching user analytics:', error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        newUsersToday: 0,
        newUsersThisWeek: 0,
        newUsersThisMonth: 0,
        usersByRole: { admin: 0, coach: 0, client: 0 },
        usersByStatus: { active: 0, inactive: 0, suspended: 0 },
        recentlyJoined: [],
        topActiveUsers: [],
      };
    }
  }

  async getSystemHealth(): Promise<SystemHealthData> {
    try {
      // For now, return mock system health data
      // In a real implementation, this would query actual system metrics
      return {
        database: {
          status: 'healthy',
          connections: 45,
          maxConnections: 100,
          responseTime: 12,
          lastBackup: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
        server: {
          status: 'healthy',
          uptime: 2592000, // 30 days in seconds
          memory: {
            used: 2.4,
            total: 8.0,
          },
          cpu: 34,
          storage: {
            used: 45.2,
            total: 100.0,
          },
        },
        services: {
          auth: 'online',
          email: 'online',
          storage: 'online',
          notifications: 'online',
        },
      };
    } catch (error) {
      console.error('Error fetching system health:', error);
      return {
        database: {
          status: 'error',
          connections: 0,
          maxConnections: 100,
          responseTime: 0,
          lastBackup: '',
        },
        server: {
          status: 'error',
          uptime: 0,
          memory: { used: 0, total: 0 },
          cpu: 0,
          storage: { used: 0, total: 0 },
        },
        services: {
          auth: 'offline',
          email: 'offline',
          storage: 'offline',
          notifications: 'offline',
        },
      };
    }
  }

  async exportAnalyticsData(startDate: Date, endDate: Date): Promise<Blob> {
    try {
      const [overview, userGrowth, sessionMetrics, coachPerformance] = await Promise.all([
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

export const adminAnalyticsService = new AdminAnalyticsService();