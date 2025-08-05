import { createServerClient } from '@/lib/supabase/server';

// Database query optimization utilities
export class DatabaseOptimizer {
  private supabase = createServerClient();
  private queryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  // Batch operations to reduce database round trips
  async batchOperations<T>(
    operations: (() => Promise<T>)[],
    options?: { 
      concurrency?: number;
      timeout?: number;
    }
  ): Promise<T[]> {
    const concurrency = options?.concurrency || 5;
    const timeout = options?.timeout || 30000;

    const results: T[] = [];
    const chunks = this.chunkArray(operations, concurrency);

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(op => 
        Promise.race([
          op(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Operation timeout')), timeout)
          )
        ])
      );

      const chunkResults = await Promise.allSettled(chunkPromises);
      
      for (const result of chunkResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error('Batch operation failed:', result.reason);
          throw result.reason;
        }
      }
    }

    return results;
  }

  // Optimized session queries with joins and filtering
  async getOptimizedUserSessions(
    userId: string, 
    role: 'client' | 'coach' | 'admin',
    options?: {
      limit?: number;
      status?: string[];
      dateRange?: { start: Date; end: Date };
      includeParticipants?: boolean;
      includeNotes?: boolean;
    }
  ) {
    const limit = options?.limit || 50;
    const cacheKey = `sessions:${userId}:${role}:${JSON.stringify(options)}`;
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    let query = this.supabase
      .from('sessions')
      .select(`
        id,
        title,
        description,
        start_time,
        end_time,
        status,
        meeting_url,
        created_at,
        updated_at,
        ${options?.includeParticipants ? `
          session_participants!inner (
            user_id,
            role,
            users (
              id,
              first_name,
              last_name,
              avatar_url
            )
          ),
        ` : ''}
        ${options?.includeNotes ? `
          session_notes (
            id,
            content,
            privacy_level,
            created_at
          ),
        ` : ''}
        coach:users!sessions_coach_id_fkey (
          id,
          first_name,
          last_name,
          avatar_url
        ),
        client:users!sessions_client_id_fkey (
          id,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .limit(limit)
      .order('start_time', { ascending: false });

    // Role-based filtering
    if (role === 'client') {
      query = query.eq('client_id', userId);
    } else if (role === 'coach') {
      query = query.eq('coach_id', userId);
    }
    // Admin can see all sessions, so no filtering needed

    // Status filtering
    if (options?.status) {
      query = query.in('status', options.status);
    }

    // Date range filtering
    if (options?.dateRange) {
      query = query
        .gte('start_time', options.dateRange.start.toISOString())
        .lte('start_time', options.dateRange.end.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database query error:', error);
      throw error;
    }

    // Cache the result
    this.setCache(cacheKey, data, 5 * 60); // 5 minutes
    return data;
  }

  // Optimized dashboard analytics query
  async getOptimizedDashboardMetrics(
    userId: string,
    role: 'client' | 'coach' | 'admin',
    timeframe: 'week' | 'month' | 'quarter' | 'year' = 'month'
  ) {
    const cacheKey = `dashboard:${userId}:${role}:${timeframe}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const startDate = this.getTimeframeStart(now, timeframe);

    // Use a single query with aggregations instead of multiple queries
    const baseQuery = `
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions,
        COUNT(CASE WHEN status = 'scheduled' AND start_time > NOW() THEN 1 END) as upcoming_sessions,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_sessions,
        AVG(CASE WHEN session_ratings.rating IS NOT NULL THEN session_ratings.rating END) as avg_rating,
        COUNT(DISTINCT DATE(start_time)) as active_days
      FROM sessions
      LEFT JOIN session_ratings ON sessions.id = session_ratings.session_id
      WHERE start_time >= $2
    `;

    let query: string;
    let params: any[];

    if (role === 'admin') {
      query = baseQuery;
      params = [startDate.toISOString()];
    } else if (role === 'coach') {
      query = baseQuery + ' AND coach_id = $1';
      params = [userId, startDate.toISOString()];
    } else {
      query = baseQuery + ' AND client_id = $1';
      params = [userId, startDate.toISOString()];
    }

    const { data, error } = await this.supabase.rpc('execute_sql', {
      sql: query,
      params,
    });

    if (error) {
      console.error('Dashboard metrics query error:', error);
      throw error;
    }

    const metrics = data?.[0] || {};

    // Additional role-specific metrics
    let additionalMetrics = {};
    
    if (role === 'coach') {
      const { data: clientData } = await this.supabase
        .from('users')
        .select('id')
        .eq('role', 'client')
        .in('id', 
          this.supabase
            .from('sessions')
            .select('client_id')
            .eq('coach_id', userId)
            .gte('start_time', startDate.toISOString())
        );

      additionalMetrics = {
        active_clients: clientData?.length || 0,
      };
    } else if (role === 'client') {
      const { data: reflectionData } = await this.supabase
        .from('reflections')
        .select('id')
        .eq('client_id', userId)
        .gte('created_at', startDate.toISOString());

      additionalMetrics = {
        reflections_count: reflectionData?.length || 0,
      };
    }

    const result = { ...metrics, ...additionalMetrics };
    
    // Cache for 15 minutes
    this.setCache(cacheKey, result, 15 * 60);
    return result;
  }

  // Optimized notification queries with proper indexing
  async getOptimizedNotifications(
    userId: string,
    options?: {
      unreadOnly?: boolean;
      limit?: number;
      types?: string[];
    }
  ) {
    const limit = options?.limit || 20;
    const cacheKey = `notifications:${userId}:${JSON.stringify(options)}`;
    
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    let query = this.supabase
      .from('notifications')
      .select(`
        id,
        title,
        message,
        type,
        is_read,
        created_at,
        metadata
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (options?.unreadOnly) {
      query = query.eq('is_read', false);
    }

    if (options?.types) {
      query = query.in('type', options.types);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Notifications query error:', error);
      throw error;
    }

    // Cache for 2 minutes (notifications need to be fresh)
    this.setCache(cacheKey, data, 2 * 60);
    return data;
  }

  // Bulk operations for better performance
  async bulkInsert<T>(
    table: string,
    records: T[],
    options?: { 
      chunkSize?: number;
      onConflict?: string;
    }
  ) {
    const chunkSize = options?.chunkSize || 100;
    const chunks = this.chunkArray(records, chunkSize);
    
    const results = [];
    
    for (const chunk of chunks) {
      let query = this.supabase.from(table).insert(chunk);
      
      if (options?.onConflict) {
        query = query.onConflict(options.onConflict);
      }
      
      const { data, error } = await query.select();
      
      if (error) {
        console.error(`Bulk insert error for table ${table}:`, error);
        throw error;
      }
      
      results.push(...(data || []));
    }
    
    return results;
  }

  async bulkUpdate<T>(
    table: string,
    updates: Array<{ id: string; updates: Partial<T> }>,
    options?: { chunkSize?: number }
  ) {
    const chunkSize = options?.chunkSize || 50;
    const chunks = this.chunkArray(updates, chunkSize);
    
    const results = [];
    
    for (const chunk of chunks) {
      // Execute updates in parallel for each chunk
      const updatePromises = chunk.map(({ id, updates }) =>
        this.supabase
          .from(table)
          .update(updates)
          .eq('id', id)
          .select()
      );
      
      const chunkResults = await Promise.allSettled(updatePromises);
      
      for (const result of chunkResults) {
        if (result.status === 'fulfilled') {
          results.push(...(result.value.data || []));
        } else {
          console.error('Bulk update error:', result.reason);
        }
      }
    }
    
    return results;
  }

  // Database connection pooling optimization
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on authentication or permission errors
        if (error instanceof Error && 
            (error.message.includes('JWT') || 
             error.message.includes('permission') ||
             error.message.includes('unauthorized'))) {
          throw error;
        }
        
        if (attempt === maxRetries) {
          break;
        }
        
        // Exponential backoff
        await this.sleep(delay * Math.pow(2, attempt - 1));
      }
    }
    
    throw lastError;
  }

  // Query analysis and optimization
  async analyzeQueryPerformance(
    query: string,
    params?: any[]
  ): Promise<{
    executionTime: number;
    planningTime: number;
    totalTime: number;
    suggestions: string[];
  }> {
    const startTime = performance.now();
    
    // Execute EXPLAIN ANALYZE
    const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
    
    try {
      const { data, error } = await this.supabase.rpc('execute_sql', {
        sql: explainQuery,
        params: params || [],
      });
      
      const endTime = performance.now();
      
      if (error) {
        console.error('Query analysis error:', error);
        return {
          executionTime: endTime - startTime,
          planningTime: 0,
          totalTime: endTime - startTime,
          suggestions: ['Unable to analyze query'],
        };
      }
      
      const plan = data?.[0]?.['QUERY PLAN']?.[0];
      const executionTime = plan?.['Execution Time'] || 0;
      const planningTime = plan?.['Planning Time'] || 0;
      
      const suggestions = this.generateOptimizationSuggestions(plan);
      
      return {
        executionTime,
        planningTime,
        totalTime: executionTime + planningTime,
        suggestions,
      };
    } catch (error) {
      console.error('Query analysis failed:', error);
      return {
        executionTime: performance.now() - startTime,
        planningTime: 0,
        totalTime: performance.now() - startTime,
        suggestions: ['Query analysis failed'],
      };
    }
  }

  // Helper methods
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private getTimeframeStart(now: Date, timeframe: string): Date {
    const start = new Date(now);
    
    switch (timeframe) {
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    return start;
  }

  private getFromCache(key: string): any {
    const cached = this.queryCache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > cached.ttl * 1000) {
      this.queryCache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  private setCache(key: string, data: any, ttlSeconds: number): void {
    this.queryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds,
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateOptimizationSuggestions(plan: any): string[] {
    const suggestions: string[] = [];
    
    if (!plan) return suggestions;
    
    // Analyze execution time
    if (plan['Execution Time'] > 1000) {
      suggestions.push('Query execution time is high (>1s). Consider adding indexes or optimizing WHERE clauses.');
    }
    
    // Check for sequential scans
    if (JSON.stringify(plan).includes('Seq Scan')) {
      suggestions.push('Sequential scan detected. Consider adding appropriate indexes.');
    }
    
    // Check for nested loops
    if (JSON.stringify(plan).includes('Nested Loop')) {
      suggestions.push('Nested loop join detected. Consider using hash joins for large datasets.');
    }
    
    // Check for sorting operations
    if (JSON.stringify(plan).includes('Sort')) {
      suggestions.push('Sorting operation detected. Consider adding indexes for ORDER BY clauses.');
    }
    
    return suggestions;
  }

  // Cleanup method
  clearCache(): void {
    this.queryCache.clear();
  }
}

// Export singleton instance
export const dbOptimizer = new DatabaseOptimizer();

// Utility functions
export async function withDatabaseOptimization<T>(
  operation: () => Promise<T>,
  cacheKey?: string,
  cacheTTL?: number
): Promise<T> {
  if (cacheKey) {
    const cached = dbOptimizer['getFromCache'](cacheKey);
    if (cached) return cached;
  }
  
  const result = await dbOptimizer.executeWithRetry(operation);
  
  if (cacheKey && cacheTTL) {
    dbOptimizer['setCache'](cacheKey, result, cacheTTL);
  }
  
  return result;
}