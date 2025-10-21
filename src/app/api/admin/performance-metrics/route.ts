import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/performance-metrics
 *
 * Returns comprehensive database performance metrics including:
 * - MFA query performance (tracking 80% improvement from materialized view)
 * - Resource Library query performance (tracking 30-50% improvement from RLS fixes)
 * - Overall query statistics
 * - Slow queries flagged for optimization (>100ms)
 *
 * Query Parameters:
 * - slowQueryThreshold: number (default: 100ms) - threshold for flagging slow queries
 * - includeSlowQueries: boolean (default: true) - include detailed slow query analysis
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication and admin role
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has admin role
    const { data: userRole, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (roleError || userRole?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const slowQueryThreshold = parseInt(searchParams.get('slowQueryThreshold') || '100');
    const includeSlowQueries = searchParams.get('includeSlowQueries') !== 'false';

    // Fetch comprehensive performance metrics
    const { data: metrics, error: metricsError } = await supabase.rpc('get_performance_metrics', {
      p_slow_query_threshold_ms: slowQueryThreshold,
    });

    if (metricsError) {
      console.error('Error fetching performance metrics:', metricsError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch performance metrics',
          details: metricsError.message,
        },
        { status: 500 }
      );
    }

    // Fetch MFA query performance
    const { data: mfaPerformance, error: mfaError } = await supabase.rpc('get_mfa_query_performance');

    if (mfaError) {
      console.error('Error fetching MFA performance:', mfaError);
    }

    // Fetch Resource Library query performance
    const { data: resourcePerformance, error: resourceError } = await supabase.rpc(
      'get_resource_library_query_performance'
    );

    if (resourceError) {
      console.error('Error fetching Resource Library performance:', resourceError);
    }

    // Fetch detailed slow queries if requested
    let slowQueries = null;
    if (includeSlowQueries) {
      const { data: slowQueriesData, error: slowQueriesError } = await supabase.rpc('get_slow_queries_detailed', {
        p_min_duration_ms: slowQueryThreshold,
        p_limit: 20,
      });

      if (slowQueriesError) {
        console.error('Error fetching slow queries:', slowQueriesError);
      } else {
        slowQueries = slowQueriesData;
      }
    }

    // Calculate improvement percentages for reporting
    const mfaMetrics = calculateMFAImprovements(mfaPerformance || []);
    const resourceMetrics = calculateResourceImprovements(resourcePerformance || []);

    // Organize metrics by category
    const organizedMetrics = {
      mfa: metrics?.filter((m: { category: string }) => m.category === 'mfa') || [],
      resource_library:
        metrics?.filter((m: { category: string }) => m.category === 'resource_library') || [],
      overall: metrics?.filter((m: { category: string }) => m.category === 'overall') || [],
      cache: metrics?.filter((m: { category: string }) => m.category === 'cache') || [],
    };

    // Get system statistics for context
    const { data: systemStats, error: statsError } = await supabase.rpc('get_system_statistics');

    if (statsError) {
      console.error('Error fetching system statistics:', statsError);
    }

    return NextResponse.json({
      success: true,
      data: {
        metrics: organizedMetrics,
        mfa: {
          queries: mfaPerformance || [],
          improvements: mfaMetrics,
        },
        resourceLibrary: {
          queries: resourcePerformance || [],
          improvements: resourceMetrics,
        },
        slowQueries: slowQueries || [],
        systemStats: systemStats || [],
        threshold: {
          slowQuery: slowQueryThreshold,
          unit: 'ms',
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error in performance metrics API:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/performance-metrics
 *
 * Reset performance statistics for fresh benchmarking
 */
export async function POST() {
  try {
    const supabase = await createClient();

    // Check authentication and admin role
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has admin role
    const { data: userRole, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (roleError || userRole?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Reset performance stats
    const { data: resetResult, error: resetError } = await supabase.rpc('reset_performance_stats');

    if (resetError) {
      console.error('Error resetting performance stats:', resetError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to reset performance statistics',
          details: resetError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        reset: resetResult,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error resetting performance stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate MFA query improvements
 * Target: 80% improvement from materialized view
 */
function calculateMFAImprovements(queries: Array<Record<string, unknown>>) {
  const materializedViewQuery = queries.find((q) => q.query_type === 'MFA Status (Materialized View)');
  const legacyJoinQuery = queries.find((q) => q.query_type === 'MFA Status (Legacy Join)');

  if (!materializedViewQuery) {
    return {
      status: 'no_data',
      message: 'No materialized view queries detected',
    };
  }

  const materializedAvg = parseFloat(materializedViewQuery.mean_exec_time_ms) || 0;
  const legacyAvg = legacyJoinQuery ? parseFloat(legacyJoinQuery.mean_exec_time_ms) : 0;

  let improvementPercentage = 0;
  if (legacyAvg > 0) {
    improvementPercentage = ((legacyAvg - materializedAvg) / legacyAvg) * 100;
  }

  return {
    status: improvementPercentage >= 80 ? 'excellent' : improvementPercentage >= 50 ? 'good' : 'needs_improvement',
    materializedViewAvg: materializedAvg,
    legacyAvg: legacyAvg || null,
    improvementPercentage: improvementPercentage > 0 ? Math.round(improvementPercentage) : 0,
    targetImprovement: 80,
    meetsTarget: improvementPercentage >= 80,
  };
}

/**
 * Calculate Resource Library query improvements
 * Target: 30-50% improvement from RLS fixes
 */
function calculateResourceImprovements(queries: Array<Record<string, unknown>>) {
  const avgExecutionTime =
    queries.reduce((sum, q) => sum + (parseFloat(String(q.mean_exec_time_ms || 0)) || 0), 0) /
    (queries.length || 1);

  const optimizedQueries = queries.filter((q) => parseFloat(String(q.mean_exec_time_ms || 0)) < 100);
  const optimizationRate = (optimizedQueries.length / (queries.length || 1)) * 100;

  // Estimate improvement based on query execution times
  // Baseline assumption: pre-optimization queries averaged ~200ms
  const baselineAvg = 200;
  const improvementPercentage = avgExecutionTime > 0 ? ((baselineAvg - avgExecutionTime) / baselineAvg) * 100 : 0;

  return {
    status:
      improvementPercentage >= 50
        ? 'excellent'
        : improvementPercentage >= 30
          ? 'good'
          : avgExecutionTime < 100
            ? 'acceptable'
            : 'needs_improvement',
    averageExecutionTime: Math.round(avgExecutionTime),
    optimizedQueriesCount: optimizedQueries.length,
    totalQueriesAnalyzed: queries.length,
    optimizationRate: Math.round(optimizationRate),
    improvementPercentage: improvementPercentage > 0 ? Math.round(improvementPercentage) : 0,
    targetImprovement: '30-50%',
    meetsTarget: improvementPercentage >= 30,
  };
}
