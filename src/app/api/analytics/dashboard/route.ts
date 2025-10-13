import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { downloadTrackingDatabase } from '@/lib/database/download-tracking';
import { fileDatabase } from '@/lib/database/files';
import { createClient } from '@/lib/supabase/server';


// Validation schema
const dashboardQuerySchema = z.object({
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  limit: z.string().regex(/^\d+$/).transform(val => parseInt(val, 10)).optional(),
});

// GET /api/analytics/dashboard - Get user's download analytics dashboard
export async function GET(request: NextRequest) {
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

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const validatedQuery = dashboardQuerySchema.parse(queryParams);

    const {
      date_from,
      date_to,
      limit = 10,
    } = validatedQuery;

    // Set default date range (last 30 days)
    const now = new Date();
    const fromDate = date_from ? new Date(date_from) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const toDate = date_to ? new Date(date_to) : now;
    
    const fromDateStr = fromDate.toISOString().split('T')[0];
    const toDateStr = toDate.toISOString().split('T')[0];

    // Get user's files
    const userFilesResult = await fileDatabase.getFileUploads({ userId: user.id });
    const userFiles = userFilesResult.files || [];
    const fileIds = userFiles.map((f: any) => f.id);

    if (fileIds.length === 0) {
      return NextResponse.json({
        summary: {
          total_files: 0,
          total_downloads: 0,
          total_bandwidth: 0,
          unique_downloaders: 0,
          conversion_rate: 0,
        },
        popular_files: [],
        recent_downloads: [],
        analytics_by_file: {},
        trends: {
          daily_downloads: [],
          top_countries: [],
          download_methods: {},
        },
        date_range: {
          from: fromDateStr,
          to: toDateStr,
          days: Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)),
        },
        generated_at: new Date().toISOString(),
      });
    }

    // Get analytics for all user files
    const [popularFiles, multipleFileStats] = await Promise.all([
      downloadTrackingDatabase.getPopularFiles(limit, fromDateStr, toDateStr),
      downloadTrackingDatabase.getMultipleFileStats(fileIds),
    ]);

    // Filter popular files to only include user's files
    const userPopularFiles = popularFiles.filter(file => 
      fileIds.includes(file.file_id)
    );

    // Get detailed analytics for top files
    const topFileIds = userPopularFiles.slice(0, 5).map(f => f.file_id);
    const detailedAnalytics: Record<string, any> = {};
    
    for (const fileId of topFileIds) {
      try {
        detailedAnalytics[fileId] = await downloadTrackingDatabase.getFileDownloadAnalytics(
          fileId,
          fromDateStr,
          toDateStr
        );
      } catch (error) {
        console.error(`Failed to get analytics for file ${fileId}:`, error);
        detailedAnalytics[fileId] = null;
      }
    }

    // Get recent downloads across all files
    const recentDownloadsPromises = topFileIds.map(fileId => 
      downloadTrackingDatabase.getRecentDownloads(fileId, 5, 0)
    );
    const recentDownloadsResults = await Promise.all(recentDownloadsPromises);
    const allRecentDownloads = recentDownloadsResults
      .flat()
      .sort((a, b) => new Date(b.downloaded_at || '').getTime() - new Date(a.downloaded_at || '').getTime())
      .slice(0, 20);

    // Calculate summary statistics
    const summary = {
      total_files: userFilesResult.count || userFiles.length,
      total_downloads: Object.values(multipleFileStats).reduce((sum: number, stat: any) => sum + (stat.total_downloads || 0), 0),
      total_bandwidth: Object.values(detailedAnalytics)
        .filter(analytics => analytics !== null)
        .reduce((sum, analytics) => sum + (analytics?.file_stats?.total_bandwidth_used || 0), 0),
      unique_downloaders: Math.max(...Object.values(detailedAnalytics)
        .filter(analytics => analytics !== null)
        .map(analytics => analytics?.file_stats?.unique_downloaders || 0), 0),
      conversion_rate: 0, // Will calculate below
    };

    // Calculate conversion rate
    const totalAttempts = Object.values(detailedAnalytics)
      .filter(analytics => analytics !== null)
      .reduce((sum, analytics) => sum + (analytics?.file_stats?.total_downloads || 0), 0);
    
    summary.conversion_rate = totalAttempts > 0 
      ? (summary.total_downloads / totalAttempts) * 100
      : 0;

    // Aggregate trends data
    const trends = {
      daily_downloads: {} as Record<string, number>,
      top_countries: {} as Record<string, number>,
      download_methods: {} as Record<string, number>,
    };

    // Aggregate data from detailed analytics
    Object.values(detailedAnalytics).forEach(analytics => {
      if (!analytics) return;

      // Daily downloads
      if (analytics.file_stats.downloads_by_date) {
        Object.entries(analytics.file_stats.downloads_by_date).forEach(([date, count]) => {
          trends.daily_downloads[date] = (trends.daily_downloads[date] || 0) + (typeof count === 'number' ? count : 0);
        });
      }

      // Countries
      analytics.geographic_distribution?.forEach(({ country_code, download_count }: any) => {
        trends.top_countries[country_code] = (trends.top_countries[country_code] || 0) + download_count;
      });

      // Download methods
      if (analytics.file_stats.download_methods) {
        Object.entries(analytics.file_stats.download_methods).forEach(([method, count]) => {
          trends.download_methods[method] = (trends.download_methods[method] || 0) + (typeof count === 'number' ? count : 0);
        });
      }
    });

    // Convert trends to arrays and sort
    const formattedTrends = {
      daily_downloads: Object.entries(trends.daily_downloads)
        .map(([date, downloads]) => ({ date, downloads }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      top_countries: Object.entries(trends.top_countries)
        .map(([country_code, downloads]) => ({ country_code, downloads }))
        .sort((a, b) => b.downloads - a.downloads)
        .slice(0, 10),
      download_methods: trends.download_methods,
    };

    // Format bandwidth
    const formatBandwidth = (bytes: number) => {
      if (bytes === 0) return { value: 0, unit: 'B', bytes };
      const units = ['B', 'KB', 'MB', 'GB', 'TB'];
      const index = Math.floor(Math.log(bytes) / Math.log(1024));
      const value = bytes / Math.pow(1024, index);
      return {
        value: parseFloat(value.toFixed(2)),
        unit: units[index] || 'B',
        bytes,
      };
    };

    return NextResponse.json({
      summary: {
        ...summary,
        total_bandwidth_formatted: formatBandwidth(summary.total_bandwidth),
      },
      popular_files: userPopularFiles.map(file => ({
        ...file,
        analytics: detailedAnalytics[file.file_id] ? {
          unique_downloaders: detailedAnalytics[file.file_id].file_stats.unique_downloaders,
          total_bandwidth: formatBandwidth(detailedAnalytics[file.file_id].file_stats.total_bandwidth_used),
          conversion_rate: detailedAnalytics[file.file_id].file_stats.total_downloads > 0 
            ? (detailedAnalytics[file.file_id].file_stats.successful_downloads / detailedAnalytics[file.file_id].file_stats.total_downloads) * 100
            : 0,
        } : null,
      })),
      recent_downloads: allRecentDownloads.map(download => ({
        id: download.id,
        file_id: download.file_id,
        download_type: download.download_type,
        downloaded_at: download.downloaded_at,
        ip_address: download.ip_address,
        country_code: download.country_code,
        success: download.success,
      })),
      analytics_by_file: detailedAnalytics,
      trends: formattedTrends,
      date_range: {
        from: fromDateStr,
        to: toDateStr,
        days: Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)),
      },
      generated_at: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Get analytics dashboard error:', error);

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