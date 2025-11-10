import { createAdminClient } from '@/lib/supabase/server';

/**
 * Query Performance Monitoring
 * Tracks and monitors query performance to validate optimization effectiveness
 * for Issue #151: Monitor and validate database performance optimizations
 */

export interface QueryMetric {
  query_type: string;
  query_hash: string;
  execution_time_ms: number;
  rows_returned?: number;
  cache_hit?: boolean;
  metadata?: Record<string, unknown>;
}

export interface PerformanceReport {
  category: string;
  metric_name: string;
  current_avg_ms: number;
  target_ms: number;
  baseline_ms?: number;
  improvement_percentage?: number;
  status: 'OPTIMAL' | 'GOOD' | 'FAIR' | 'NEEDS_OPTIMIZATION';
  total_queries: number;
  within_target: boolean;
}

export interface ValidationResult {
  category: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  metrics: PerformanceReport[];
  summary: {
    total_optimal: number;
    total_within_target: number;
    total_metrics: number;
    pass_percentage: number;
  };
}

export class QueryPerformanceMonitor {
  private supabase = createAdminClient();
  private metricsBuffer: QueryMetric[] = [];
  private flushInterval = 30000; // 30 seconds
  private flushIntervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.startAutoFlush();
  }

  /**
   * Record a query execution
   */
  async recordQueryMetric(metric: QueryMetric): Promise<void> {
    this.metricsBuffer.push(metric);

    // Flush immediately if buffer is getting large
    if (this.metricsBuffer.length >= 50) {
      await this.flushMetrics();
    }
  }

  /**
   * Record query with execution time tracking
   */
  async trackQueryExecution<T>(
    queryType: string,
    operation: () => Promise<T>,
    queryHash?: string
  ): Promise<T> {
    const startTime = performance.now();

    try {
      const result = await operation();
      const executionTime = performance.now() - startTime;

      const metric: QueryMetric = {
        query_type: queryType,
        query_hash: queryHash || this.generateHash(queryType),
        execution_time_ms: executionTime,
        metadata: {
          timestamp: new Date().toISOString(),
          success: true,
        },
      };

      await this.recordQueryMetric(metric);
      return result;
    } catch (error) {
      const executionTime = performance.now() - startTime;

      const metric: QueryMetric = {
        query_type: queryType,
        query_hash: queryHash || this.generateHash(queryType),
        execution_time_ms: executionTime,
        metadata: {
          timestamp: new Date().toISOString(),
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };

      await this.recordQueryMetric(metric);
      throw error;
    }
  }

  /**
   * Flush buffered metrics to database
   */
  async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    const metricsToInsert = this.metricsBuffer.map(metric => ({
      query_type: metric.query_type,
      query_hash: metric.query_hash,
      execution_time_ms: metric.execution_time_ms,
      rows_returned: metric.rows_returned || null,
      cache_hit: metric.cache_hit || false,
      metadata: metric.metadata || null,
    }));

    try {
      const { error } = await this.supabase
        .from('query_performance_metrics')
        .insert(metricsToInsert);

      if (error) {
        console.error('Failed to flush query metrics:', error);
      } else {
        this.metricsBuffer = [];
      }
    } catch (error) {
      console.error('Error flushing metrics:', error);
    }
  }

  /**
   * Get dashboard performance validation
   */
  async getDashboardPerformance(): Promise<PerformanceReport[]> {
    try {
      const { data, error } = await this.supabase.rpc(
        'validate_dashboard_performance'
      );

      if (error) {
        console.error('Dashboard performance validation error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting dashboard performance:', error);
      return [];
    }
  }

  /**
   * Get coach clients list performance validation
   */
  async getCoachClientsPerformance(): Promise<PerformanceReport[]> {
    try {
      const { data, error } = await this.supabase.rpc(
        'validate_coach_clients_performance'
      );

      if (error) {
        console.error('Coach clients performance validation error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting coach clients performance:', error);
      return [];
    }
  }

  /**
   * Get user statistics performance validation
   */
  async getUserStatsPerformance(): Promise<PerformanceReport[]> {
    try {
      const { data, error } = await this.supabase.rpc(
        'validate_user_stats_performance'
      );

      if (error) {
        console.error('User stats performance validation error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting user stats performance:', error);
      return [];
    }
  }

  /**
   * Get comprehensive performance validation report
   */
  async getPerformanceValidationReport(): Promise<PerformanceReport[]> {
    try {
      const { data, error } = await this.supabase.rpc(
        'get_performance_validation_report'
      );

      if (error) {
        console.error('Performance validation report error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting performance validation report:', error);
      return [];
    }
  }

  /**
   * Get optimization indexes usage
   */
  async getIndexUsageStats() {
    try {
      const { data, error } = await this.supabase.rpc(
        'get_optimization_indexes_usage'
      );

      if (error) {
        console.error('Index usage stats error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting index usage stats:', error);
      return [];
    }
  }

  /**
   * Generate comprehensive validation result
   */
  async generateValidationReport(): Promise<ValidationResult> {
    // Flush any pending metrics
    await this.flushMetrics();

    const report = await this.getPerformanceValidationReport();

    const dashboardMetrics = report.filter(m => m.category === 'Dashboard');
    const coachMetrics = report.filter(m => m.category === 'Coach Clients');
    const userStatsMetrics = report.filter(
      m => m.category === 'User Statistics'
    );

    // Calculate summary statistics
    const allMetrics = [
      ...dashboardMetrics,
      ...coachMetrics,
      ...userStatsMetrics,
    ];
    const optimalCount = allMetrics.filter(m => m.status === 'OPTIMAL').length;
    const withinTargetCount = allMetrics.filter(m => m.within_target).length;
    const passPercentage =
      allMetrics.length > 0 ? (withinTargetCount / allMetrics.length) * 100 : 0;

    const status =
      passPercentage >= 80 ? 'PASS' : passPercentage >= 50 ? 'WARN' : 'FAIL';

    return {
      category: 'Comprehensive Performance Validation',
      status,
      metrics: allMetrics,
      summary: {
        total_optimal: optimalCount,
        total_within_target: withinTargetCount,
        total_metrics: allMetrics.length,
        pass_percentage: Math.round(passPercentage * 100) / 100,
      },
    };
  }

  /**
   * Get query performance summary for a specific metric
   */
  async getMetricSummary(metricName: string) {
    try {
      const { data, error } = await this.supabase
        .from('query_performance_metrics')
        .select('execution_time_ms, cache_hit, created_at')
        .eq('query_type', metricName)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching metric summary:', error);
        return null;
      }

      if (!data || data.length === 0) {
        return null;
      }

      const times = data.map(d => d.execution_time_ms);
      const cacheHits = data.filter(d => d.cache_hit).length;

      return {
        metric_name: metricName,
        sample_size: data.length,
        avg_execution_time: times.reduce((a, b) => a + b, 0) / times.length,
        min_execution_time: Math.min(...times),
        max_execution_time: Math.max(...times),
        p95_execution_time: this.calculatePercentile(times, 0.95),
        p99_execution_time: this.calculatePercentile(times, 0.99),
        cache_hit_rate: (cacheHits / data.length) * 100,
        most_recent_samples: data.slice(0, 10),
      };
    } catch (error) {
      console.error('Error getting metric summary:', error);
      return null;
    }
  }

  /**
   * Get slow queries identified
   */
  async getSlowQueries(threshold_ms: number = 100, limit: number = 20) {
    try {
      const { data, error } = await this.supabase.rpc(
        'get_slow_queries_detailed',
        {
          p_min_duration_ms: threshold_ms,
          p_limit: limit,
        }
      );

      if (error) {
        console.error('Error fetching slow queries:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting slow queries:', error);
      return [];
    }
  }

  /**
   * Clear old metrics to maintain database size
   */
  async clearOldMetrics(daysOld: number = 7): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { error } = await this.supabase
        .from('query_performance_metrics')
        .delete()
        .lt('created_at', cutoffDate.toISOString());

      if (error) {
        console.error('Error clearing old metrics:', error);
      }
    } catch (error) {
      console.error('Error in clearOldMetrics:', error);
    }
  }

  // Private helper methods

  private startAutoFlush(): void {
    this.flushIntervalId = setInterval(() => {
      this.flushMetrics().catch(error => {
        console.error('Auto-flush error:', error);
      });
    }, this.flushInterval);
  }

  private generateHash(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `query_${Math.abs(hash).toString(16)}`;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Cleanup method to flush remaining metrics and stop auto-flush
   */
  async cleanup(): Promise<void> {
    if (this.flushIntervalId) {
      clearInterval(this.flushIntervalId);
      this.flushIntervalId = null;
    }
    await this.flushMetrics();
  }
}

// Export singleton instance
export const queryMonitor = new QueryPerformanceMonitor();

// Utility function for tracking query performance
export async function withQueryMonitoring<T>(
  queryType: string,
  operation: () => Promise<T>,
  options?: { hash?: string }
): Promise<T> {
  return queryMonitor.trackQueryExecution(queryType, operation, options?.hash);
}
