import { createClient } from '@/lib/supabase/server';
import { Database } from '@/lib/database/database.types';

type FileDownloadLog = Database['public']['Tables']['file_download_logs']['Row'];
type FileAnalyticsSummary = Database['public']['Tables']['file_analytics_summary']['Row'];
type UserDownloadStatistics = Database['public']['Tables']['user_download_statistics']['Row'];

export interface DownloadLogData {
  file_id: string;
  downloaded_by?: string; // User ID, null for anonymous
  download_type?: 'direct' | 'temporary_share' | 'permanent_share' | 'version_download';
  share_id?: string;
  ip_address?: string;
  user_agent?: string;
  country_code?: string;
  city?: string;
  file_size_at_download?: number;
  download_duration_ms?: number;
  success?: boolean;
  failure_reason?: string;
  bandwidth_used?: number;
  client_info?: Record<string, any>;
}

export interface FileDownloadStats {
  total_downloads: number;
  successful_downloads: number;
  failed_downloads: number;
  unique_downloaders: number;
  unique_ip_addresses: number;
  total_bandwidth_used: number;
  average_download_duration?: number;
  download_methods?: Record<string, number>;
  top_countries?: string[];
  downloads_by_date?: Record<string, number>;
  peak_download_hour?: number;
}

export interface UserDownloadHistory {
  download_id: string;
  file_id: string;
  filename: string;
  file_type: string;
  download_type: string;
  downloaded_at: string;
  file_size: number | null;
  success: boolean;
}

export interface PopularFile {
  file_id: string;
  filename: string;
  file_type: string;
  file_size: number;
  total_downloads: number;
  unique_downloaders: number;
}

export interface DownloadAnalytics {
  file_stats: FileDownloadStats;
  recent_downloads: FileDownloadLog[];
  top_downloaders: Array<{
    user_id: string;
    download_count: number;
    last_download: string;
  }>;
  geographic_distribution: Array<{
    country_code: string;
    download_count: number;
  }>;
  hourly_distribution: Array<{
    hour: number;
    download_count: number;
  }>;
}

class DownloadTrackingDatabase {
  private supabase = createClient();

  /**
   * Log a file download attempt
   */
  async logDownload(data: DownloadLogData): Promise<string> {
    const supabase = await createClient();
    
    const { data: logId, error } = await supabase.rpc('log_file_download', {
      p_file_id: data.file_id,
      p_downloaded_by: data.downloaded_by || null,
      p_download_type: data.download_type || 'direct',
      p_share_id: data.share_id || null,
      p_ip_address: data.ip_address || null,
      p_user_agent: data.user_agent || null,
      p_country_code: data.country_code || null,
      p_city: data.city || null,
      p_file_size_at_download: data.file_size_at_download || null,
      p_download_duration_ms: data.download_duration_ms || null,
      p_success: data.success ?? true,
      p_failure_reason: data.failure_reason || null,
      p_bandwidth_used: data.bandwidth_used || null,
      p_client_info: data.client_info ? JSON.stringify(data.client_info) : '{}',
    });

    if (error) {
      throw new Error(`Failed to log download: ${error.message}`);
    }

    return logId;
  }

  /**
   * Get comprehensive download statistics for a file
   */
  async getFileDownloadStats(
    file_id: string,
    date_from?: string,
    date_to?: string
  ): Promise<FileDownloadStats> {
    const supabase = await createClient();
    
    const { data: stats, error } = await supabase.rpc('get_file_download_stats', {
      p_file_id: file_id,
      p_date_from: date_from || null,
      p_date_to: date_to || null,
    });

    if (error) {
      throw new Error(`Failed to get download stats: ${error.message}`);
    }

    return stats || {
      total_downloads: 0,
      successful_downloads: 0,
      failed_downloads: 0,
      unique_downloaders: 0,
      unique_ip_addresses: 0,
      total_bandwidth_used: 0,
    };
  }

  /**
   * Get recent download logs for a file
   */
  async getRecentDownloads(
    file_id: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<FileDownloadLog[]> {
    const supabase = await createClient();
    
    const { data: downloads, error } = await supabase
      .from('file_download_logs')
      .select('*')
      .eq('file_id', file_id)
      .order('downloaded_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to get recent downloads: ${error.message}`);
    }

    return downloads || [];
  }

  /**
   * Get download analytics for a file
   */
  async getFileDownloadAnalytics(
    file_id: string,
    date_from?: string,
    date_to?: string
  ): Promise<DownloadAnalytics> {
    const supabase = await createClient();
    
    const [fileStats, recentDownloads, topDownloaders, geoDistribution] = await Promise.all([
      this.getFileDownloadStats(file_id, date_from, date_to),
      this.getRecentDownloads(file_id, 20),
      this.getTopDownloaders(file_id, date_from, date_to, 10),
      this.getGeographicDistribution(file_id, date_from, date_to),
    ]);

    // Get hourly distribution
    const hourlyDistribution = await this.getHourlyDistribution(file_id, date_from, date_to);

    return {
      file_stats: fileStats,
      recent_downloads: recentDownloads,
      top_downloaders: topDownloaders,
      geographic_distribution: geoDistribution,
      hourly_distribution: hourlyDistribution,
    };
  }

  /**
   * Get top downloaders for a file
   */
  private async getTopDownloaders(
    file_id: string,
    date_from?: string,
    date_to?: string,
    limit: number = 10
  ): Promise<Array<{ user_id: string; download_count: number; last_download: string }>> {
    const supabase = await createClient();
    
    const fromDate = date_from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const toDate = date_to || new Date().toISOString();

    const { data: downloaders, error } = await supabase
      .from('file_download_logs')
      .select('downloaded_by, downloaded_at')
      .eq('file_id', file_id)
      .not('downloaded_by', 'is', null)
      .eq('success', true)
      .gte('downloaded_at', fromDate)
      .lte('downloaded_at', toDate)
      .order('downloaded_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get top downloaders: ${error.message}`);
    }

    // Group by user and count downloads
    const downloaderMap = new Map<string, { count: number; lastDownload: string }>();
    
    downloaders?.forEach(download => {
      if (download.downloaded_by) {
        const existing = downloaderMap.get(download.downloaded_by);
        if (existing) {
          existing.count++;
          if (download.downloaded_at > existing.lastDownload) {
            existing.lastDownload = download.downloaded_at;
          }
        } else {
          downloaderMap.set(download.downloaded_by, {
            count: 1,
            lastDownload: download.downloaded_at,
          });
        }
      }
    });

    return Array.from(downloaderMap.entries())
      .map(([user_id, data]) => ({
        user_id,
        download_count: data.count,
        last_download: data.lastDownload,
      }))
      .sort((a, b) => b.download_count - a.download_count)
      .slice(0, limit);
  }

  /**
   * Get geographic distribution of downloads
   */
  private async getGeographicDistribution(
    file_id: string,
    date_from?: string,
    date_to?: string
  ): Promise<Array<{ country_code: string; download_count: number }>> {
    const supabase = await createClient();
    
    const fromDate = date_from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const toDate = date_to || new Date().toISOString();

    const { data: countries, error } = await supabase
      .from('file_download_logs')
      .select('country_code')
      .eq('file_id', file_id)
      .eq('success', true)
      .not('country_code', 'is', null)
      .gte('downloaded_at', fromDate)
      .lte('downloaded_at', toDate);

    if (error) {
      throw new Error(`Failed to get geographic distribution: ${error.message}`);
    }

    // Count by country
    const countryMap = new Map<string, number>();
    countries?.forEach(download => {
      if (download.country_code) {
        countryMap.set(download.country_code, (countryMap.get(download.country_code) || 0) + 1);
      }
    });

    return Array.from(countryMap.entries())
      .map(([country_code, download_count]) => ({ country_code, download_count }))
      .sort((a, b) => b.download_count - a.download_count);
  }

  /**
   * Get hourly distribution of downloads
   */
  private async getHourlyDistribution(
    file_id: string,
    date_from?: string,
    date_to?: string
  ): Promise<Array<{ hour: number; download_count: number }>> {
    const supabase = await createClient();
    
    const fromDate = date_from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const toDate = date_to || new Date().toISOString();

    const { data: downloads, error } = await supabase
      .from('file_download_logs')
      .select('downloaded_at')
      .eq('file_id', file_id)
      .eq('success', true)
      .gte('downloaded_at', fromDate)
      .lte('downloaded_at', toDate);

    if (error) {
      throw new Error(`Failed to get hourly distribution: ${error.message}`);
    }

    // Count by hour
    const hourMap = new Map<number, number>();
    downloads?.forEach(download => {
      const hour = new Date(download.downloaded_at).getHours();
      hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
    });

    return Array.from(hourMap.entries())
      .map(([hour, download_count]) => ({ hour, download_count }))
      .sort((a, b) => a.hour - b.hour);
  }

  /**
   * Get user download history
   */
  async getUserDownloadHistory(
    user_id: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<UserDownloadHistory[]> {
    const supabase = await createClient();
    
    const { data: history, error } = await supabase.rpc('get_user_download_history', {
      p_user_id: user_id,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      throw new Error(`Failed to get user download history: ${error.message}`);
    }

    return history || [];
  }

  /**
   * Get popular files (most downloaded)
   */
  async getPopularFiles(
    limit: number = 10,
    date_from?: string,
    date_to?: string
  ): Promise<PopularFile[]> {
    const supabase = await createClient();
    
    const { data: files, error } = await supabase.rpc('get_popular_files', {
      p_limit: limit,
      p_date_from: date_from || null,
      p_date_to: date_to || null,
    });

    if (error) {
      throw new Error(`Failed to get popular files: ${error.message}`);
    }

    return files || [];
  }

  /**
   * Get user's most downloaded files
   */
  async getUserTopFiles(user_id: string, limit: number = 10): Promise<Array<{
    file_id: string;
    filename: string;
    download_count: number;
    last_download: string;
  }>> {
    const supabase = await createClient();
    
    const { data: files, error } = await supabase
      .from('user_download_statistics')
      .select(`
        file_id,
        total_downloads,
        last_download_at,
        file:file_uploads!file_id (
          filename
        )
      `)
      .eq('user_id', user_id)
      .order('total_downloads', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get user top files: ${error.message}`);
    }

    return files?.map(f => ({
      file_id: f.file_id,
      filename: f.file?.filename || 'Unknown',
      download_count: f.total_downloads,
      last_download: f.last_download_at || '',
    })) || [];
  }

  /**
   * Get download statistics summary for multiple files
   */
  async getMultipleFileStats(file_ids: string[]): Promise<Record<string, {
    total_downloads: number;
    unique_downloaders: number;
    last_download?: string;
  }>> {
    if (file_ids.length === 0) return {};

    const supabase = await createClient();
    
    const { data: stats, error } = await supabase
      .from('file_analytics_summary')
      .select('file_id, total_downloads, unique_downloaders, updated_at')
      .in('file_id', file_ids);

    if (error) {
      throw new Error(`Failed to get multiple file stats: ${error.message}`);
    }

    const result: Record<string, any> = {};
    
    // Initialize with zeros
    file_ids.forEach(id => {
      result[id] = {
        total_downloads: 0,
        unique_downloaders: 0,
      };
    });

    // Aggregate stats
    stats?.forEach(stat => {
      if (!result[stat.file_id]) {
        result[stat.file_id] = {
          total_downloads: 0,
          unique_downloaders: 0,
        };
      }
      result[stat.file_id].total_downloads += stat.total_downloads || 0;
      result[stat.file_id].unique_downloaders = Math.max(
        result[stat.file_id].unique_downloaders,
        stat.unique_downloaders || 0
      );
      if (!result[stat.file_id].last_download || stat.updated_at > result[stat.file_id].last_download) {
        result[stat.file_id].last_download = stat.updated_at;
      }
    });

    return result;
  }

  /**
   * Extract client info from user agent and other headers
   */
  parseClientInfo(userAgent?: string, acceptLanguage?: string): Record<string, any> {
    if (!userAgent) return {};

    const clientInfo: Record<string, any> = {
      user_agent: userAgent,
    };

    // Basic browser detection
    if (userAgent.includes('Chrome')) {
      clientInfo.browser = 'Chrome';
    } else if (userAgent.includes('Firefox')) {
      clientInfo.browser = 'Firefox';
    } else if (userAgent.includes('Safari')) {
      clientInfo.browser = 'Safari';
    } else if (userAgent.includes('Edge')) {
      clientInfo.browser = 'Edge';
    }

    // Basic OS detection
    if (userAgent.includes('Windows')) {
      clientInfo.os = 'Windows';
    } else if (userAgent.includes('Mac OS X')) {
      clientInfo.os = 'macOS';
    } else if (userAgent.includes('Linux')) {
      clientInfo.os = 'Linux';
    } else if (userAgent.includes('Android')) {
      clientInfo.os = 'Android';
    } else if (userAgent.includes('iOS')) {
      clientInfo.os = 'iOS';
    }

    // Device type detection
    if (userAgent.includes('Mobile')) {
      clientInfo.device_type = 'Mobile';
    } else if (userAgent.includes('Tablet')) {
      clientInfo.device_type = 'Tablet';
    } else {
      clientInfo.device_type = 'Desktop';
    }

    // Language preference
    if (acceptLanguage) {
      clientInfo.languages = acceptLanguage.split(',').map(lang => lang.split(';')[0].trim());
    }

    return clientInfo;
  }

  /**
   * Get IP-based location info (you'd need to integrate with a geolocation service)
   */
  async getLocationFromIP(ip: string): Promise<{ country_code?: string; city?: string }> {
    // This is a placeholder - you would integrate with services like:
    // - MaxMind GeoLite2
    // - IP2Location
    // - ipapi.co
    // - Abstract API
    
    // For demo purposes, return empty location
    // In production, implement actual geolocation lookup
    return {};
  }

  /**
   * Generate download tracking middleware helper
   */
  createDownloadTracker(options: {
    file_id: string;
    user_id?: string;
    download_type?: string;
    share_id?: string;
  }) {
    return async (
      ip_address?: string,
      user_agent?: string,
      file_size?: number,
      success: boolean = true,
      failure_reason?: string,
      duration_ms?: number
    ) => {
      const clientInfo = this.parseClientInfo(user_agent);
      const location = ip_address ? await this.getLocationFromIP(ip_address) : {};

      return this.logDownload({
        file_id: options.file_id,
        downloaded_by: options.user_id,
        download_type: (options.download_type as any) || 'direct',
        share_id: options.share_id,
        ip_address,
        user_agent,
        country_code: location.country_code,
        city: location.city,
        file_size_at_download: file_size,
        download_duration_ms: duration_ms,
        success,
        failure_reason,
        bandwidth_used: success ? file_size : undefined,
        client_info: clientInfo,
      });
    };
  }
}

// Export singleton instance
export const downloadTrackingDatabase = new DownloadTrackingDatabase();