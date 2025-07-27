import type { Session, SessionStatus } from '@/types';
import { BaseSessionService, GetSessionsOptions, GetSessionsCountOptions } from './base-session';

/**
 * Session analytics, search, and reporting service
 * Handles filtering, pagination, search, and analytics operations for sessions
 */
export class SessionAnalyticsService extends BaseSessionService {

  /**
   * Search sessions by title or description
   */
  async searchSessions(
    query: string, 
    userId?: string, 
    status?: SessionStatus
  ): Promise<Session[]> {
    let queryBuilder = this.supabase
      .from('sessions')
      .select(this.getSessionSelectQuery())
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`);

    if (userId) {
      queryBuilder = queryBuilder.or(`coach_id.eq.${userId},client_id.eq.${userId}`);
    }

    if (status) {
      queryBuilder = queryBuilder.eq('status', status);
    }

    queryBuilder = queryBuilder.order('scheduled_at', { ascending: false });

    const { data, error } = await queryBuilder;

    if (error) {
      this.logError('searching sessions', error);
      return [];
    }

    return data.map(this.mapDatabaseSessionToSession);
  }

  /**
   * Get sessions with pagination and filtering
   */
  async getSessionsPaginated(options: GetSessionsOptions): Promise<Session[]> {
    let query = this.supabase
      .from('sessions')
      .select(this.getSessionSelectQuery());

    // Apply filters
    if (options.status) {
      query = query.eq('status', options.status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show');
    }
    if (options.coachId) {
      query = query.eq('coach_id', options.coachId);
    }
    if (options.clientId) {
      query = query.eq('client_id', options.clientId);
    }
    if (options.from) {
      query = query.gte('scheduled_at', options.from);
    }
    if (options.to) {
      query = query.lte('scheduled_at', options.to);
    }

    // Apply sorting
    const sortBy = options.sortBy || 'scheduled_at';
    const sortOrder = options.sortOrder || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      this.logError('fetching sessions with pagination', error);
      return [];
    }

    return data.map(this.mapDatabaseSessionToSession);
  }

  /**
   * Get total count of sessions with filtering
   */
  async getSessionsCount(options: GetSessionsCountOptions): Promise<number> {
    let query = this.supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true });

    // Apply filters
    if (options.status) {
      query = query.eq('status', options.status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show');
    }
    if (options.coachId) {
      query = query.eq('coach_id', options.coachId);
    }
    if (options.clientId) {
      query = query.eq('client_id', options.clientId);
    }
    if (options.from) {
      query = query.gte('scheduled_at', options.from);
    }
    if (options.to) {
      query = query.lte('scheduled_at', options.to);
    }

    const { count, error } = await query;

    if (error) {
      this.logError('counting sessions', error);
      return 0;
    }

    return count || 0;
  }

  /**
   * Get sessions by date range
   */
  async findByDateRange(from: string, to: string, userId?: string): Promise<Session[]> {
    const options: GetSessionsOptions = { from, to };
    if (userId) {
      // Check both coach and client fields
      const { data, error } = await this.supabase
        .from('sessions')
        .select(this.getSessionSelectQuery())
        .or(`coach_id.eq.${userId},client_id.eq.${userId}`)
        .gte('scheduled_at', from)
        .lte('scheduled_at', to)
        .order('scheduled_at', { ascending: false });

      if (error) {
        this.logError('fetching sessions by date range', error);
        return [];
      }

      return data.map(this.mapDatabaseSessionToSession);
    }
    
    return this.getSessionsPaginated(options);
  }

  /**
   * Get session analytics for a date range
   */
  async getSessionAnalytics(from: string, to: string, userId?: string): Promise<{
    totalSessions: number;
    completedSessions: number;
    cancelledSessions: number;
    upcomingSessions: number;
    averageDuration: number;
    completionRate: number;
    cancellationRate: number;
    sessionsByStatus: Record<SessionStatus, number>;
    sessionsByDay: { date: string; count: number }[];
  }> {
    let query = this.supabase
      .from('sessions')
      .select('status, scheduled_at, duration_minutes')
      .gte('scheduled_at', from)
      .lte('scheduled_at', to);

    if (userId) {
      query = query.or(`coach_id.eq.${userId},client_id.eq.${userId}`);
    }

    const { data, error } = await query;

    if (error) {
      this.logError('fetching session analytics', error);
      return this.getEmptyAnalytics();
    }

    const now = new Date();
    const analytics = {
      totalSessions: data.length,
      completedSessions: 0,
      cancelledSessions: 0,
      upcomingSessions: 0,
      averageDuration: 0,
      completionRate: 0,
      cancellationRate: 0,
      sessionsByStatus: {} as Record<SessionStatus, number>,
      sessionsByDay: [] as { date: string; count: number }[],
    };

    // Initialize status counts
    const statusCounts: Record<string, number> = {
      'scheduled': 0,
      'in_progress': 0,
      'completed': 0,
      'cancelled': 0,
      'no_show': 0,
    };

    // Group sessions by date
    const sessionsByDate: Record<string, number> = {};
    let totalDuration = 0;

    data.forEach(session => {
      const date = session.scheduled_at.split('T')[0]; // Extract date part
      sessionsByDate[date] = (sessionsByDate[date] || 0) + 1;
      
      statusCounts[session.status] = (statusCounts[session.status] || 0) + 1;
      totalDuration += session.duration_minutes;

      // Count by status
      switch (session.status) {
        case 'completed':
          analytics.completedSessions++;
          break;
        case 'cancelled':
          analytics.cancelledSessions++;
          break;
        case 'scheduled':
        case 'in_progress':
          if (new Date(session.scheduled_at) > now) {
            analytics.upcomingSessions++;
          }
          break;
      }
    });

    // Calculate rates
    analytics.averageDuration = data.length > 0 ? totalDuration / data.length : 0;
    analytics.completionRate = data.length > 0 ? (analytics.completedSessions / data.length) * 100 : 0;
    analytics.cancellationRate = data.length > 0 ? (analytics.cancelledSessions / data.length) * 100 : 0;

    // Convert sessionsByDate to array format
    analytics.sessionsByDay = Object.entries(sessionsByDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    analytics.sessionsByStatus = statusCounts as Record<SessionStatus, number>;

    return analytics;
  }

  /**
   * Get coach performance analytics
   */
  async getCoachAnalytics(coachId: string, from: string, to: string): Promise<{
    totalSessions: number;
    uniqueClients: number;
    averageSessionsPerClient: number;
    topClients: { clientName: string; sessionCount: number }[];
    weeklyTrends: { week: string; sessionCount: number }[];
  }> {
    const { data, error } = await this.supabase
      .from('sessions')
      .select(`
        id,
        scheduled_at,
        client:users!sessions_client_id_fkey(id, first_name, last_name)
      `)
      .eq('coach_id', coachId)
      .gte('scheduled_at', from)
      .lte('scheduled_at', to);

    if (error) {
      this.logError('fetching coach analytics', error);
      return {
        totalSessions: 0,
        uniqueClients: 0,
        averageSessionsPerClient: 0,
        topClients: [],
        weeklyTrends: [],
      };
    }

    // Count unique clients and sessions per client
    const clientCounts = new Map<string, { name: string; count: number }>();
    const weeklyData = new Map<string, number>();

    data.forEach(session => {
      if (session.client) {
        const clientId = session.client.id;
        const clientName = `${session.client.first_name || ''} ${session.client.last_name || ''}`.trim();
        
        if (clientCounts.has(clientId)) {
          clientCounts.get(clientId)!.count++;
        } else {
          clientCounts.set(clientId, { name: clientName, count: 1 });
        }
      }

      // Group by week
      const sessionDate = new Date(session.scheduled_at);
      const weekStart = new Date(sessionDate);
      weekStart.setDate(sessionDate.getDate() - sessionDate.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      
      weeklyData.set(weekKey, (weeklyData.get(weekKey) || 0) + 1);
    });

    const uniqueClients = clientCounts.size;
    const averageSessionsPerClient = uniqueClients > 0 ? data.length / uniqueClients : 0;

    // Get top clients
    const topClients = Array.from(clientCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(client => ({ clientName: client.name, sessionCount: client.count }));

    // Convert weekly data to array
    const weeklyTrends = Array.from(weeklyData.entries())
      .map(([week, sessionCount]) => ({ week, sessionCount }))
      .sort((a, b) => a.week.localeCompare(b.week));

    return {
      totalSessions: data.length,
      uniqueClients,
      averageSessionsPerClient,
      topClients,
      weeklyTrends,
    };
  }

  /**
   * Get popular time slots analytics
   */
  async getTimeSlotAnalytics(userId?: string): Promise<{
    hourlyDistribution: { hour: number; count: number }[];
    dayOfWeekDistribution: { dayOfWeek: number; count: number }[];
    monthlyTrends: { month: string; count: number }[];
  }> {
    let query = this.supabase
      .from('sessions')
      .select('scheduled_at')
      .in('status', ['completed', 'in_progress', 'scheduled']);

    if (userId) {
      query = query.or(`coach_id.eq.${userId},client_id.eq.${userId}`);
    }

    const { data, error } = await query;

    if (error) {
      this.logError('fetching time slot analytics', error);
      return {
        hourlyDistribution: [],
        dayOfWeekDistribution: [],
        monthlyTrends: [],
      };
    }

    const hourCounts = new Array(24).fill(0);
    const dayOfWeekCounts = new Array(7).fill(0);
    const monthCounts = new Map<string, number>();

    data.forEach(session => {
      const sessionDate = new Date(session.scheduled_at);
      
      // Hour distribution
      hourCounts[sessionDate.getHours()]++;
      
      // Day of week distribution (0 = Sunday)
      dayOfWeekCounts[sessionDate.getDay()]++;
      
      // Monthly trends
      const monthKey = `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, '0')}`;
      monthCounts.set(monthKey, (monthCounts.get(monthKey) || 0) + 1);
    });

    return {
      hourlyDistribution: hourCounts.map((count, hour) => ({ hour, count })),
      dayOfWeekDistribution: dayOfWeekCounts.map((count, dayOfWeek) => ({ dayOfWeek, count })),
      monthlyTrends: Array.from(monthCounts.entries())
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month)),
    };
  }

  /**
   * Get empty analytics structure
   */
  private getEmptyAnalytics() {
    return {
      totalSessions: 0,
      completedSessions: 0,
      cancelledSessions: 0,
      upcomingSessions: 0,
      averageDuration: 0,
      completionRate: 0,
      cancellationRate: 0,
      sessionsByStatus: {} as Record<SessionStatus, number>,
      sessionsByDay: [] as { date: string; count: number }[],
    };
  }

  /**
   * Advanced search with multiple criteria
   */
  async advancedSearch(criteria: {
    query?: string;
    coachId?: string;
    clientId?: string;
    status?: SessionStatus[];
    dateFrom?: string;
    dateTo?: string;
    durationMin?: number;
    durationMax?: number;
    hasNotes?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ sessions: Session[]; totalCount: number }> {
    let query = this.supabase
      .from('sessions')
      .select(this.getSessionSelectQuery(), { count: 'exact' });

    // Apply text search
    if (criteria.query) {
      query = query.or(`title.ilike.%${criteria.query}%,description.ilike.%${criteria.query}%,notes.ilike.%${criteria.query}%`);
    }

    // Apply filters
    if (criteria.coachId) {
      query = query.eq('coach_id', criteria.coachId);
    }
    if (criteria.clientId) {
      query = query.eq('client_id', criteria.clientId);
    }
    if (criteria.status && criteria.status.length > 0) {
      query = query.in('status', criteria.status);
    }
    if (criteria.dateFrom) {
      query = query.gte('scheduled_at', criteria.dateFrom);
    }
    if (criteria.dateTo) {
      query = query.lte('scheduled_at', criteria.dateTo);
    }
    if (criteria.durationMin) {
      query = query.gte('duration_minutes', criteria.durationMin);
    }
    if (criteria.durationMax) {
      query = query.lte('duration_minutes', criteria.durationMax);
    }
    if (criteria.hasNotes !== undefined) {
      if (criteria.hasNotes) {
        query = query.not('notes', 'is', null).neq('notes', '');
      } else {
        query = query.or('notes.is.null,notes.eq.');
      }
    }

    // Apply pagination
    if (criteria.limit) {
      query = query.limit(criteria.limit);
    }
    if (criteria.offset) {
      query = query.range(criteria.offset, criteria.offset + (criteria.limit || 10) - 1);
    }

    // Order by relevance (scheduled_at desc)
    query = query.order('scheduled_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      this.logError('performing advanced search', error);
      return { sessions: [], totalCount: 0 };
    }

    return {
      sessions: data.map(this.mapDatabaseSessionToSession),
      totalCount: count || 0,
    };
  }
}