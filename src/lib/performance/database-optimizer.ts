/**
 * Database Performance Optimizer
 * Provides optimized database operations, connection pooling, and query optimization
 */

import { createClient } from '@/lib/supabase/server';
import { getCachedData, CacheKeys, CacheTTL } from './cache';

// Connection pool configuration
const CONNECTION_POOL_CONFIG = {
  maxConnections: 20,
  idleTimeout: 30000, // 30 seconds
  connectionTimeout: 10000, // 10 seconds
  retryAttempts: 3
};

// Query optimization patterns
export class QueryOptimizer {
  private static instance: QueryOptimizer;
  private connectionPool: Map<string, any> = new Map();
  
  private constructor() {}
  
  static getInstance(): QueryOptimizer {
    if (!QueryOptimizer.instance) {
      QueryOptimizer.instance = new QueryOptimizer();
    }
    return QueryOptimizer.instance;
  }

  // Optimized batch query execution
  async executeBatchQuery<T = any>(
    queries: Array<{
      key: string;
      query: () => Promise<T>;
      cacheKey?: string;
      ttl?: number;
    }>
  ): Promise<Record<string, T>> {
    const results: Record<string, T> = {};
    const promises = queries.map(async ({ key, query, cacheKey, ttl = CacheTTL.MEDIUM }) => {
      try {
        let result: T;
        
        if (cacheKey) {
          result = await getCachedData(cacheKey, query, ttl);
        } else {
          result = await query();
        }
        
        results[key] = result;
      } catch (error) {
        console.error(`Batch query failed for key ${key}:`, error);
        throw error;
      }
    });

    await Promise.all(promises);
    return results;
  }

  // Optimized pagination with cursor-based approach for better performance
  async paginateQuery<T = any>({
    baseQuery,
    pageSize = 20,
    cursor,
    sortColumn = 'created_at',
    sortDirection = 'desc'
  }: {
    baseQuery: any;
    pageSize?: number;
    cursor?: string;
    sortColumn?: string;
    sortDirection?: 'asc' | 'desc';
  }): Promise<{
    data: T[];
    nextCursor?: string;
    hasMore: boolean;
  }> {
    let query = baseQuery.order(sortColumn, { ascending: sortDirection === 'asc' });
    
    if (cursor) {
      const operator = sortDirection === 'asc' ? 'gt' : 'lt';
      query = query[operator](sortColumn, cursor);
    }
    
    // Fetch one extra item to check if there are more
    const { data, error } = await query.limit(pageSize + 1);
    
    if (error) throw error;
    
    const hasMore = data.length > pageSize;
    const items = hasMore ? data.slice(0, pageSize) : data;
    const nextCursor = hasMore && items.length > 0 
      ? items[items.length - 1][sortColumn] 
      : undefined;

    return {
      data: items,
      nextCursor,
      hasMore
    };
  }

  // Optimized count query with approximation for large datasets
  async getApproximateCount(
    tableName: string,
    filters?: Record<string, any>
  ): Promise<number> {
    const supabase = await createClient();
    
    try {
      // For large tables, use approximate count from statistics
      const { data, error } = await supabase
        .from('pg_stat_user_tables')
        .select('n_tup_ins, n_tup_upd, n_tup_del')
        .eq('relname', tableName)
        .single();
      
      if (!error && data) {
        // Approximate count based on statistics
        return data.n_tup_ins - data.n_tup_del;
      }
    } catch {
      // Fall back to exact count for smaller tables
    }
    
    // Exact count as fallback
    let query = supabase.from(tableName).select('*', { count: 'exact', head: true });
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }
    
    const { count, error } = await query;
    if (error) throw error;
    
    return count || 0;
  }

  // Batch insert optimization
  async batchInsert<T = any>(
    tableName: string,
    records: T[],
    batchSize = 1000
  ): Promise<T[]> {
    const supabase = await createClient();
    const results: T[] = [];
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from(tableName)
        .insert(batch)
        .select();
      
      if (error) throw error;
      if (data) results.push(...data);
    }
    
    return results;
  }

  // Optimized upsert operation
  async optimizedUpsert<T = any>(
    tableName: string,
    records: T[],
    conflictColumns: string[]
  ): Promise<T[]> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from(tableName)
      .upsert(records, { 
        onConflict: conflictColumns.join(','),
        ignoreDuplicates: false
      })
      .select();
    
    if (error) throw error;
    return data || [];
  }
}

// Pre-built optimized queries for common operations
export class OptimizedQueries {
  private queryOptimizer = QueryOptimizer.getInstance();
  
  // Optimized session queries
  async getSessionsWithRelations(filters: {
    userId?: string;
    role?: 'coach' | 'client' | 'admin';
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const supabase = await createClient();
    const { userId, role, status, limit = 10, offset = 0 } = filters;
    
    let query = supabase
      .from('sessions')
      .select(`
        id,
        title,
        description,
        scheduled_at,
        duration_minutes,
        status,
        notes,
        meeting_url,
        coach:users!coach_id(
          id,
          first_name,
          last_name,
          avatar_url
        ),
        client:users!client_id(
          id,
          first_name,
          last_name,
          avatar_url
        )
      `);

    // Apply role-based filters
    if (userId && role) {
      if (role === 'coach') {
        query = query.eq('coach_id', userId);
      } else if (role === 'client') {
        query = query.eq('client_id', userId);
      }
      // Admin sees all sessions - no filter needed
    }

    // Apply status filter
    if (status) {
      query = query.eq('status', status);
    }

    // Apply pagination with cursor optimization for large datasets
    if (offset > 1000) {
      // Use cursor-based pagination for large offsets
      return this.queryOptimizer.paginateQuery({
        baseQuery: query,
        pageSize: limit,
        sortColumn: 'scheduled_at',
        sortDirection: 'desc'
      });
    }

    // Standard offset pagination for smaller datasets
    const { data, error } = await query
      .order('scheduled_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { data: data || [], hasMore: data?.length === limit };
  }

  // Optimized reflection queries
  async getReflectionsOptimized(filters: {
    userId: string;
    sessionId?: string;
    search?: string;
    moodMin?: number;
    moodMax?: number;
    limit?: number;
    offset?: number;
  }) {
    const supabase = await createClient();
    const { userId, sessionId, search, moodMin, moodMax, limit = 20, offset = 0 } = filters;

    const cacheKey = CacheKeys.reflections(userId, JSON.stringify(filters));

    return getCachedData(
      cacheKey,
      async () => {
        let query = supabase
          .from('reflections')
          .select(`
            id,
            client_id,
            session_id,
            content,
            mood_rating,
            insights,
            goals_for_next_session,
            created_at,
            updated_at,
            session:sessions(
              id,
              title,
              scheduled_at
            )
          `)
          .eq('client_id', userId);

        // Apply filters
        if (sessionId) query = query.eq('session_id', sessionId);
        if (search) {
          const sanitizedSearch = search.replace(/[%_\\]/g, '\\$&').replace(/'/g, "''");
          query = query.or(`content.ilike.%${sanitizedSearch}%,insights.ilike.%${sanitizedSearch}%`);
        }
        if (moodMin !== undefined) query = query.gte('mood_rating', moodMin);
        if (moodMax !== undefined) query = query.lte('mood_rating', moodMax);

        const { data, error } = await query
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) throw error;
        return data || [];
      },
      CacheTTL.MEDIUM
    );
  }

  // Optimized dashboard stats
  async getDashboardStats(userId: string, role: string) {
    const cacheKey = CacheKeys.dashboardStats(userId, role);

    return getCachedData(
      cacheKey,
      async () => {
        return this.queryOptimizer.executeBatchQuery([
          {
            key: 'sessions',
            query: async () => {
              const supabase = await createClient();
              const roleColumn = role === 'coach' ? 'coach_id' : 'client_id';
              
              const { data, error } = await supabase
                .from('sessions')
                .select('status')
                .eq(roleColumn, userId);
              
              if (error) throw error;
              
              return {
                total: data.length,
                completed: data.filter(s => s.status === 'completed').length,
                upcoming: data.filter(s => s.status === 'scheduled').length,
                cancelled: data.filter(s => s.status === 'cancelled').length
              };
            }
          },
          {
            key: 'reflections',
            query: async () => {
              if (role !== 'client') return { total: 0, averageMood: 0 };
              
              const supabase = await createClient();
              const { data, error } = await supabase
                .from('reflections')
                .select('mood_rating')
                .eq('client_id', userId)
                .not('mood_rating', 'is', null);
              
              if (error) throw error;
              
              const total = data.length;
              const averageMood = total > 0 
                ? data.reduce((sum, r) => sum + (r.mood_rating || 0), 0) / total 
                : 0;
              
              return { total, averageMood };
            }
          }
        ]);
      },
      CacheTTL.DASHBOARD
    );
  }
}

// Export singleton instances
export const queryOptimizer = QueryOptimizer.getInstance();
export const optimizedQueries = new OptimizedQueries();

// Performance monitoring for database operations
export class DatabasePerformanceMonitor {
  private static queryTimes: Map<string, number[]> = new Map();
  
  static startTimer(queryName: string): string {
    const timerId = `${queryName}-${Date.now()}-${Math.random()}`;
    return timerId;
  }
  
  static endTimer(timerId: string, queryName: string) {
    const startTime = parseFloat(timerId.split('-')[1]);
    const duration = performance.now() - startTime;
    
    if (!this.queryTimes.has(queryName)) {
      this.queryTimes.set(queryName, []);
    }
    
    const times = this.queryTimes.get(queryName)!;
    times.push(duration);
    
    // Keep only last 100 measurements
    if (times.length > 100) {
      times.shift();
    }
    
    // Log slow queries
    if (duration > 1000) { // Queries taking longer than 1 second
      console.warn(`[DB Performance] Slow query detected: ${queryName}`, {
        duration: `${duration.toFixed(2)}ms`,
        averageTime: `${(times.reduce((a, b) => a + b, 0) / times.length).toFixed(2)}ms`
      });
    }
  }
  
  static getStats() {
    const stats: Record<string, { 
      count: number; 
      average: number; 
      min: number; 
      max: number; 
    }> = {};
    
    for (const [queryName, times] of this.queryTimes.entries()) {
      if (times.length > 0) {
        stats[queryName] = {
          count: times.length,
          average: times.reduce((a, b) => a + b, 0) / times.length,
          min: Math.min(...times),
          max: Math.max(...times)
        };
      }
    }
    
    return stats;
  }
}

// Query performance decorator
export function monitorQuery(queryName: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const timerId = DatabasePerformanceMonitor.startTimer(queryName);
      
      try {
        const result = await originalMethod.apply(this, args);
        DatabasePerformanceMonitor.endTimer(timerId, queryName);
        return result;
      } catch (error) {
        DatabasePerformanceMonitor.endTimer(timerId, queryName);
        throw error;
      }
    };
    
    return descriptor;
  };
}