import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { downloadTrackingDatabase } from '@/lib/database/download-tracking';
import { z } from 'zod';

// Validation schema
const historyQuerySchema = z.object({
  limit: z.string().regex(/^\d+$/).transform(val => parseInt(val, 10)).optional(),
  offset: z.string().regex(/^\d+$/).transform(val => parseInt(val, 10)).optional(),
});

// GET /api/users/[id]/download-history - Get user's download history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Users can only view their own download history
    if (id !== user.id) {
      return NextResponse.json(
        { error: 'You can only view your own download history' },
        { status: 403 }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const validatedQuery = historyQuerySchema.parse(queryParams);

    const {
      limit = 50,
      offset = 0,
    } = validatedQuery;

    // Get user's download history
    const downloadHistory = await downloadTrackingDatabase.getUserDownloadHistory(
      id,
      limit,
      offset
    );

    // Get user's top downloaded files
    const topFiles = await downloadTrackingDatabase.getUserTopFiles(id, 10);

    // Get total download count for pagination
    const { data: totalDownloads, error: countError } = await supabase
      .from('file_download_logs')
      .select('id', { count: 'exact' })
      .eq('downloaded_by', id);

    if (countError) {
      throw new Error(`Failed to get total download count: ${countError.message}`);
    }

    // Calculate statistics
    const totalCount = totalDownloads?.length || 0;
    const successfulDownloads = downloadHistory.filter(d => d.success).length;
    const uniqueFiles = new Set(downloadHistory.map(d => d.file_id)).size;
    
    // Group downloads by date for trend analysis
    const downloadsByDate: Record<string, number> = {};
    downloadHistory.forEach(download => {
      const date = download.downloaded_at.split('T')[0];
      downloadsByDate[date] = (downloadsByDate[date] || 0) + 1;
    });

    // Group downloads by file type
    const downloadsByType: Record<string, number> = {};
    downloadHistory.forEach(download => {
      const type = download.file_type.split('/')[0]; // Get main type (image, video, etc.)
      downloadsByType[type] = (downloadsByType[type] || 0) + 1;
    });

    // Calculate download patterns
    const downloadPatterns = {
      most_active_hour: null as number | null,
      most_active_day: null as string | null,
      favorite_file_type: Object.keys(downloadsByType).length > 0 
        ? Object.entries(downloadsByType).sort(([,a], [,b]) => b - a)[0][0] 
        : null,
    };

    // Get hourly distribution
    const hourlyDownloads: Record<number, number> = {};
    downloadHistory.forEach(download => {
      const hour = new Date(download.downloaded_at).getHours();
      hourlyDownloads[hour] = (hourlyDownloads[hour] || 0) + 1;
    });

    if (Object.keys(hourlyDownloads).length > 0) {
      downloadPatterns.most_active_hour = parseInt(
        Object.entries(hourlyDownloads).sort(([,a], [,b]) => b - a)[0][0]
      );
    }

    // Get daily distribution
    const dailyDownloads: Record<string, number> = {};
    downloadHistory.forEach(download => {
      const day = new Date(download.downloaded_at).toLocaleDateString('en-US', { weekday: 'long' });
      dailyDownloads[day] = (dailyDownloads[day] || 0) + 1;
    });

    if (Object.keys(dailyDownloads).length > 0) {
      downloadPatterns.most_active_day = Object.entries(dailyDownloads).sort(([,a], [,b]) => b - a)[0][0];
    }

    return NextResponse.json({
      user_id: id,
      download_history: downloadHistory,
      top_files: topFiles,
      statistics: {
        total_downloads: totalCount,
        successful_downloads: successfulDownloads,
        failed_downloads: totalCount - successfulDownloads,
        unique_files_downloaded: uniqueFiles,
        success_rate: totalCount > 0 ? (successfulDownloads / totalCount) * 100 : 0,
      },
      trends: {
        downloads_by_date: Object.entries(downloadsByDate)
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date)),
        downloads_by_type: Object.entries(downloadsByType)
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count),
        hourly_distribution: Object.entries(hourlyDownloads)
          .map(([hour, count]) => ({ hour: parseInt(hour), count }))
          .sort((a, b) => a.hour - b.hour),
        daily_distribution: Object.entries(dailyDownloads)
          .map(([day, count]) => ({ day, count }))
          .sort((a, b) => b.count - a.count),
      },
      patterns: downloadPatterns,
      pagination: {
        limit,
        offset,
        total: totalCount,
        has_next: (offset + limit) < totalCount,
        has_prev: offset > 0,
        next_offset: (offset + limit) < totalCount ? offset + limit : null,
        prev_offset: offset > 0 ? Math.max(0, offset - limit) : null,
      },
      generated_at: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Get user download history error:', error);

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