import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { queryMonitor } from '@/lib/performance/query-monitoring';

/**
 * GET /api/admin/performance-validation
 *
 * Issue #151: Monitor and validate database performance optimizations
 *
 * Returns comprehensive validation report for the Sprint 06 optimizations:
 * - Dashboard queries: 100ms → 5-10ms (10-20x faster)
 * - Coach clients list: 300ms → 15ms (20x faster)
 * - User statistics: 250ms → 10ms (25x faster)
 *
 * Query Parameters:
 * - category: 'dashboard' | 'coach-clients' | 'user-stats' | 'all' (default: 'all')
 * - includeIndexUsage: boolean (default: true) - show index usage statistics
 * - includeMetricsSummary: boolean (default: true) - show historical metrics
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
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user has admin role
    const { data: userRole, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (roleError || userRole?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') || 'all';
    const includeIndexUsage = searchParams.get('includeIndexUsage') !== 'false';
    const includeMetricsSummary = searchParams.get('includeMetricsSummary') !== 'false';

    // Get comprehensive validation report
    const validationReport = await queryMonitor.getPerformanceValidationReport();

    // Filter by category if specified
    let filteredReport = validationReport;
    if (category !== 'all') {
      const categoryMap: Record<string, string> = {
        dashboard: 'Dashboard',
        'coach-clients': 'Coach Clients',
        'user-stats': 'User Statistics',
      };
      const categoryName = categoryMap[category];
      if (categoryName) {
        filteredReport = validationReport.filter(m => m.category === categoryName);
      }
    }

    // Get index usage statistics
    let indexUsage = null;
    if (includeIndexUsage) {
      indexUsage = await queryMonitor.getIndexUsageStats();
    }

    // Get metrics summary for each query type
    let metricsSummaries: Record<string, unknown> | null = null;
    if (includeMetricsSummary) {
      metricsSummaries = {};
      const queryTypes = [
        'Dashboard Sessions',
        'Dashboard Ratings',
        'Coach Client Sessions',
        'User Statistics',
      ];

      for (const queryType of queryTypes) {
        const summary = await queryMonitor.getMetricSummary(queryType);
        if (summary) {
          metricsSummaries[queryType] = summary;
        }
      }
    }

    // Generate summary statistics
    const summaryStats = {
      total_metrics: filteredReport.length,
      optimal_count: filteredReport.filter(m => m.status === 'OPTIMAL').length,
      good_count: filteredReport.filter(m => m.status === 'GOOD').length,
      fair_count: filteredReport.filter(m => m.status === 'FAIR').length,
      needs_optimization: filteredReport.filter(m => m.status === 'NEEDS_OPTIMIZATION')
        .length,
      within_target_count: filteredReport.filter(m => m.within_target).length,
      within_target_percentage:
        filteredReport.length > 0
          ? Math.round(
              (filteredReport.filter(m => m.within_target).length /
                filteredReport.length) *
                100
            )
          : 0,
    };

    // Determine overall validation status
    const overallStatus =
      summaryStats.within_target_percentage >= 80
        ? 'PASS'
        : summaryStats.within_target_percentage >= 50
          ? 'WARN'
          : 'FAIL';

    return NextResponse.json({
      success: true,
      data: {
        validation_status: overallStatus,
        timestamp: new Date().toISOString(),
        category: category === 'all' ? 'All Categories' : category,
        metrics: filteredReport,
        summary: summaryStats,
        index_usage: includeIndexUsage ? indexUsage : null,
        metrics_summaries: includeMetricsSummary ? metricsSummaries : null,
        targets: {
          dashboard: {
            baseline_ms: 100,
            target_ms: '5-10',
            target_improvement: '10-20x',
          },
          coach_clients: {
            baseline_ms: 300,
            target_ms: 15,
            target_improvement: '20x',
          },
          user_statistics: {
            baseline_ms: 250,
            target_ms: 10,
            target_improvement: '25x',
          },
        },
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error in performance validation API:', error);
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
 * POST /api/admin/performance-validation
 *
 * Trigger collection and analysis of fresh performance metrics
 * Useful for benchmarking after deployment or configuration changes
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication and admin role
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user has admin role
    const { data: userRole, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (roleError || userRole?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Flush any pending metrics
    await queryMonitor.flushMetrics();

    // Get fresh validation report
    const validationReport = await queryMonitor.getPerformanceValidationReport();

    // Generate comprehensive report
    const result = await queryMonitor.generateValidationReport();

    return NextResponse.json({
      success: true,
      data: {
        validation_result: result,
        metrics_flushed: true,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error in performance validation POST:', error);
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
 * DELETE /api/admin/performance-validation
 *
 * Clear old performance metrics to maintain database size
 * Query parameter: daysOld (default: 7) - remove metrics older than this
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication and admin role
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user has admin role
    const { data: userRole, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (roleError || userRole?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const daysOld = parseInt(searchParams.get('daysOld') || '7');

    // Clear old metrics
    await queryMonitor.clearOldMetrics(daysOld);

    return NextResponse.json({
      success: true,
      data: {
        message: `Cleared performance metrics older than ${daysOld} days`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error clearing performance metrics:', error);
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
