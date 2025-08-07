import { createServerClient } from '@/lib/supabase/server';
import { ANALYTICS_CONFIG, getSessionRate, getDefaultCoachRating } from '@/lib/config/analytics-constants';

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

      // Calculate estimated revenue using configurable session rate
      const revenue = (completedSessions || 0) * getSessionRate();

      return {
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalSessions: totalSessions || 0,
        completedSessions: completedSessions || 0,
        revenue,
        averageRating: getDefaultCoachRating(), // TODO: Calculate from actual ratings table
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

      // Use database function to get aggregated daily user data more efficiently
      // This replaces the inefficient loop with a single database query
      const { data: rawData, error } = await supabase.rpc('get_daily_user_growth', {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      });

      if (error) {
        console.warn('Database function not available, falling back to optimized queries:', error.message);
        return this.getUserGrowthFallback(startDate, endDate);
      }

      // Transform the data from the database function
      return rawData?.map((row: any) => ({
        date: row.date,
        newUsers: row.new_users || 0,
        activeUsers: row.active_users || 0,
        totalUsers: row.total_users || 0,
      })) || [];

    } catch (error) {
      console.error('Error fetching user growth analytics:', error);
      return this.getUserGrowthFallback(startDate, endDate);
    }
  }

  // Optimized fallback method that reduces database queries
  private async getUserGrowthFallback(startDate: Date, endDate: Date): Promise<UserGrowthData[]> {
    try {
      const supabase = createServerClient();

      // Get all users created in the date range with their creation dates
      const { data: users } = await supabase
        .from('users')
        .select('created_at, last_seen_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at');

      // Get total users count up to start date for baseline
      const { count: baselineUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', startDate.toISOString());

      // Generate date range
      const dates = [];
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const userGrowthData: UserGrowthData[] = [];
      let runningTotal = baselineUsers || 0;

      for (const date of dates) {
        const dateStr = date.toISOString().split('T')[0];
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        // Count new users for this specific date from pre-loaded data
        const newUsers = users?.filter(user => {
          const createdAt = new Date(user.created_at);
          return createdAt >= date && createdAt < nextDate;
        }).length || 0;

        runningTotal += newUsers;

        // Count active users (seen within last 7 days) from pre-loaded data
        const sevenDaysBefore = new Date(date);
        sevenDaysBefore.setDate(sevenDaysBefore.getDate() - 7);

        const activeUsers = users?.filter(user => {
          if (!user.last_seen_at) return false;
          const lastSeen = new Date(user.last_seen_at);
          return lastSeen >= sevenDaysBefore && lastSeen <= nextDate;
        }).length || 0;

        userGrowthData.push({
          date: dateStr,
          newUsers,
          activeUsers,
          totalUsers: runningTotal,
        });
      }

      return userGrowthData;
    } catch (error) {
      console.error('Error in fallback user growth analytics:', error);
      return [];
    }
  }

  async getSessionMetrics(startDate: Date, endDate: Date): Promise<SessionMetricsData[]> {
    try {
      const supabase = createServerClient();

      // Use database function for optimized session metrics
      const { data: rawData, error } = await supabase.rpc('get_daily_session_metrics', {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      });

      if (error) {
        console.warn('Database function not available, falling back to optimized queries:', error.message);
        return this.getSessionMetricsFallback(startDate, endDate);
      }

      // Transform the data from the database function
      return rawData?.map((row: any) => ({
        date: row.date,
        totalSessions: row.total_sessions || 0,
        completedSessions: row.completed_sessions || 0,
        cancelledSessions: row.cancelled_sessions || 0,
        scheduledSessions: row.scheduled_sessions || 0,
        completionRate: row.completion_rate || 0,
      })) || [];

    } catch (error) {
      console.error('Error fetching session metrics analytics:', error);
      return this.getSessionMetricsFallback(startDate, endDate);
    }
  }

  // Optimized fallback method using a single query instead of multiple queries per date
  private async getSessionMetricsFallback(startDate: Date, endDate: Date): Promise<SessionMetricsData[]> {
    try {
      const supabase = createServerClient();

      // Get all sessions in the date range with their status and scheduled date
      const { data: sessions } = await supabase
        .from('sessions')
        .select('scheduled_at, status')
        .gte('scheduled_at', startDate.toISOString())
        .lte('scheduled_at', endDate.toISOString())
        .order('scheduled_at');

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

        // Filter sessions for this specific date from pre-loaded data
        const dailySessions = sessions?.filter(session => {
          const scheduledAt = new Date(session.scheduled_at);
          return scheduledAt >= date && scheduledAt < nextDate;
        }) || [];

        // Count by status from in-memory data instead of separate database queries
        const totalSessions = dailySessions.length;
        const completedSessions = dailySessions.filter(s => s.status === 'completed').length;
        const cancelledSessions = dailySessions.filter(s => s.status === 'cancelled').length;
        const scheduledSessions = dailySessions.filter(s => s.status === 'scheduled').length;

        const completionRate = totalSessions > 0 
          ? Math.round((completedSessions / totalSessions) * 100) 
          : 0;

        sessionMetricsData.push({
          date: dateStr,
          totalSessions,
          completedSessions,
          cancelledSessions,
          scheduledSessions,
          completionRate,
        });
      }

      return sessionMetricsData;
    } catch (error) {
      console.error('Error in fallback session metrics analytics:', error);
      return [];
    }
  }

  async getCoachPerformance(startDate: Date, endDate: Date): Promise<CoachPerformanceData[]> {
    try {
      const supabase = createServerClient();

      // Get all coaches from users table
      const { data: coachData, error: coachError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('role', 'coach')
        .eq('status', 'active');

      if (coachError) {
        throw coachError;
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
          .eq('coach_id', coach.id)
          .gte('scheduled_at', startDate.toISOString())
          .lte('scheduled_at', endDate.toISOString());

        const { count: completedSessions } = await supabase
          .from('sessions')
          .select('*', { count: 'exact', head: true })
          .eq('coach_id', coach.id)
          .eq('status', 'completed')
          .gte('scheduled_at', startDate.toISOString())
          .lte('scheduled_at', endDate.toISOString());

        // Get unique clients in date range using distinct
        const { data: clientsData } = await supabase
          .from('sessions')
          .select('client_id')
          .eq('coach_id', coach.id)
          .gte('scheduled_at', startDate.toISOString())
          .lte('scheduled_at', endDate.toISOString());

        // Count unique client IDs
        const uniqueClients = new Set(clientsData?.map(session => session.client_id) || []);
        const activeClients = uniqueClients.size;
        
        const completionRate = totalSessions && totalSessions > 0 
          ? Math.round((completedSessions || 0) / totalSessions * 100) 
          : 0;

        // Use configurable session rate
        const revenue = (completedSessions || 0) * getSessionRate();

        // Use default coach rating (TODO: Calculate from actual ratings)
        const averageRating = getDefaultCoachRating();

        const coachName = [coach.first_name, coach.last_name].filter(Boolean).join(' ') || coach.email;

        coachPerformance.push({
          coachId: coach.id,
          coachName,
          totalSessions: totalSessions || 0,
          completedSessions: completedSessions || 0,
          averageRating,
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