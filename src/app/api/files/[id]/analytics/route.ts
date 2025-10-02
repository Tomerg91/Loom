import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient, setSupabaseCookieStore } from '@/lib/supabase/server';
import { fileDatabase } from '@/lib/database/files';
import { downloadTrackingDatabase } from '@/lib/database/download-tracking';
import { z } from 'zod';

// Validation schema
const analyticsQuerySchema = z.object({
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  include_logs: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  logs_limit: z.string().regex(/^\d+$/).transform(val => parseInt(val, 10)).optional(),
});

// GET /api/files/[id]/analytics - Get comprehensive download analytics for a file
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = cookies();
  setSupabaseCookieStore(cookieStore);
  try {
    const { id } = await params;
    
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user owns the file
    const file = await fileDatabase.getFileUpload(id);
    
    if (file.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only view analytics for files you own' },
        { status: 403 }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const validatedQuery = analyticsQuerySchema.parse(queryParams);

    const {
      date_from,
      date_to,
      include_logs = false,
      logs_limit = 50,
    } = validatedQuery;

    // Get comprehensive analytics
    const analytics = await downloadTrackingDatabase.getFileDownloadAnalytics(
      id,
      date_from,
      date_to
    );

    // Get additional data if requested
    let recentLogs = null;
    if (include_logs) {
      recentLogs = await downloadTrackingDatabase.getRecentDownloads(
        id,
        logs_limit,
        0
      );
    }

    // Calculate additional metrics
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [monthlyStats, weeklyStats] = await Promise.all([
      downloadTrackingDatabase.getFileDownloadStats(
        id,
        thirtyDaysAgo.toISOString().split('T')[0],
        now.toISOString().split('T')[0]
      ),
      downloadTrackingDatabase.getFileDownloadStats(
        id,
        sevenDaysAgo.toISOString().split('T')[0],
        now.toISOString().split('T')[0]
      ),
    ]);

    // Calculate trends
    const trends = {
      daily_average: monthlyStats.total_downloads / 30,
      weekly_total: weeklyStats.total_downloads,
      conversion_rate: monthlyStats.total_downloads > 0 
        ? (monthlyStats.successful_downloads / monthlyStats.total_downloads) * 100
        : 0,
      avg_downloads_per_user: monthlyStats.unique_downloaders > 0
        ? monthlyStats.successful_downloads / monthlyStats.unique_downloaders
        : 0,
    };

    // Format bandwidth data
    const formatBandwidth = (bytes: number) => {
      if (bytes === 0) return { value: 0, unit: 'B' };
      const units = ['B', 'KB', 'MB', 'GB', 'TB'];
      const index = Math.floor(Math.log(bytes) / Math.log(1024));
      const value = bytes / Math.pow(1024, index);
      return {
        value: parseFloat(value.toFixed(2)),
        unit: units[index] || 'B',
      };
    };

    return NextResponse.json({
      file: {
        id: file.id,
        filename: file.filename,
        file_type: file.file_type,
        file_size: file.file_size,
        created_at: file.created_at,
      },
      analytics: {
        ...analytics,
        trends,
        monthly_stats: monthlyStats,
        weekly_stats: weeklyStats,
      },
      bandwidth: {
        total: formatBandwidth(analytics.file_stats.total_bandwidth_used),
        monthly: formatBandwidth(monthlyStats.total_bandwidth_used),
        weekly: formatBandwidth(weeklyStats.total_bandwidth_used),
      },
      date_range: {
        from: date_from || null,
        to: date_to || null,
        default_range_days: date_from && date_to 
          ? Math.ceil((new Date(date_to).getTime() - new Date(date_from).getTime()) / (1000 * 60 * 60 * 24))
          : 30,
      },
      recent_logs: include_logs ? recentLogs : null,
      generated_at: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Get file analytics error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid query parameters',
          details: error.errors 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}