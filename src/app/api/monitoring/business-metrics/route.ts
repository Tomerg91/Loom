import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient, setSupabaseCookieStore } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/security/rate-limit';
import { trackBusinessMetric } from '@/lib/monitoring/sentry';

// Business metrics collection endpoint
const rateLimitedMetrics = rateLimit(100, 60000)( // 100 requests per minute
  async (request: NextRequest) => {
    const start = Date.now();
    
    try {
      const supabase = await createClient();
      const body = await request.json();
      
      // Validate request body
      if (!body.metrics || !Array.isArray(body.metrics)) {
        return NextResponse.json({ error: 'Invalid metrics format' }, { status: 400 });
      }
      
      const businessMetrics = await collectBusinessMetrics(supabase);
      
      // Process incoming metrics
      for (const metric of body.metrics) {
        if (metric.name && typeof metric.value === 'number') {
          trackBusinessMetric(metric.name, metric.value, metric.tags || {});
        }
      }
      
      // Return current business metrics
      const response = {
        status: 'success',
        timestamp: new Date().toISOString(),
        metrics: businessMetrics,
        processing_time: Date.now() - start,
      };
      
      return NextResponse.json(response);
      
    } catch (error) {
      const errorResponse = {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        processing_time: Date.now() - start,
      };
      
      return NextResponse.json(errorResponse, { status: 500 });
    }
  }
);

// GET /api/monitoring/business-metrics - Retrieve business metrics
export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  setSupabaseCookieStore(cookieStore);
  return rateLimitedMetrics(request);
}

// POST /api/monitoring/business-metrics - Submit metrics data
export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  setSupabaseCookieStore(cookieStore);
  return rateLimitedMetrics(request);
}

// Collect comprehensive business metrics
async function collectBusinessMetrics(supabase: any) {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const metrics = {
    user_engagement: await getUserEngagementMetrics(supabase, last24h, last7d, last30d),
    session_metrics: await getSessionMetrics(supabase, last24h, last7d, last30d),
    file_metrics: await getFileMetrics(supabase, last24h, last7d, last30d),
    auth_metrics: await getAuthMetrics(supabase, last24h, last7d, last30d),
    performance_metrics: await getPerformanceMetrics(supabase, last24h, last7d, last30d),
  };
  
  return metrics;
}

// User engagement metrics
async function getUserEngagementMetrics(supabase: any, last24h: Date, last7d: Date, last30d: Date) {
  try {
    // Active users
    const { data: activeUsers24h } = await supabase
      .from('profiles')
      .select('id')
      .gte('last_seen', last24h.toISOString());
    
    const { data: activeUsers7d } = await supabase
      .from('profiles')
      .select('id')
      .gte('last_seen', last7d.toISOString());
    
    const { data: activeUsers30d } = await supabase
      .from('profiles')
      .select('id')
      .gte('last_seen', last30d.toISOString());
    
    // New user registrations
    const { data: newUsers24h } = await supabase
      .from('profiles')
      .select('id')
      .gte('created_at', last24h.toISOString());
    
    const { data: newUsers7d } = await supabase
      .from('profiles')
      .select('id')
      .gte('created_at', last7d.toISOString());
    
    // Session duration (avg from sessions)
    const { data: sessionDurations } = await supabase
      .from('sessions')
      .select('duration_minutes')
      .gte('created_at', last7d.toISOString())
      .not('duration_minutes', 'is', null);
    
    const avgSessionDuration = sessionDurations?.reduce((sum: number, session: any) => 
      sum + (session.duration_minutes || 0), 0
    ) / (sessionDurations?.length || 1);
    
    return {
      active_users_24h: activeUsers24h?.length || 0,
      active_users_7d: activeUsers7d?.length || 0,
      active_users_30d: activeUsers30d?.length || 0,
      new_users_24h: newUsers24h?.length || 0,
      new_users_7d: newUsers7d?.length || 0,
      avg_session_duration_minutes: Math.round(avgSessionDuration || 0),
      user_retention_7d: calculateRetentionRate(activeUsers7d?.length || 0, newUsers7d?.length || 0),
    };
  } catch (error) {
    console.error('Error collecting user engagement metrics:', error);
    return {
      active_users_24h: 0,
      active_users_7d: 0,
      active_users_30d: 0,
      new_users_24h: 0,
      new_users_7d: 0,
      avg_session_duration_minutes: 0,
      user_retention_7d: 0,
    };
  }
}

// Session booking and completion metrics
async function getSessionMetrics(supabase: any, last24h: Date, last7d: Date, last30d: Date) {
  try {
    // Session bookings
    const { data: sessions24h } = await supabase
      .from('sessions')
      .select('id, status')
      .gte('created_at', last24h.toISOString());
    
    const { data: sessions7d } = await supabase
      .from('sessions')
      .select('id, status')
      .gte('created_at', last7d.toISOString());
    
    const { data: sessions30d } = await supabase
      .from('sessions')
      .select('id, status')
      .gte('created_at', last30d.toISOString());
    
    // Completed sessions
    const completedSessions24h = sessions24h?.filter(s => s.status === 'completed')?.length || 0;
    const completedSessions7d = sessions7d?.filter(s => s.status === 'completed')?.length || 0;
    const completedSessions30d = sessions30d?.filter(s => s.status === 'completed')?.length || 0;
    
    // Cancelled sessions
    const cancelledSessions24h = sessions24h?.filter(s => s.status === 'cancelled')?.length || 0;
    const cancelledSessions7d = sessions7d?.filter(s => s.status === 'cancelled')?.length || 0;
    
    // Session ratings
    const { data: ratings7d } = await supabase
      .from('session_ratings')
      .select('rating')
      .gte('created_at', last7d.toISOString());
    
    const avgRating = ratings7d?.reduce((sum: number, r: any) => sum + r.rating, 0) / (ratings7d?.length || 1);
    
    return {
      sessions_booked_24h: sessions24h?.length || 0,
      sessions_booked_7d: sessions7d?.length || 0,
      sessions_booked_30d: sessions30d?.length || 0,
      sessions_completed_24h: completedSessions24h,
      sessions_completed_7d: completedSessions7d,
      sessions_completed_30d: completedSessions30d,
      sessions_cancelled_24h: cancelledSessions24h,
      sessions_cancelled_7d: cancelledSessions7d,
      completion_rate_7d: calculateCompletionRate(completedSessions7d, sessions7d?.length || 0),
      cancellation_rate_7d: calculateCancellationRate(cancelledSessions7d, sessions7d?.length || 0),
      avg_session_rating: Math.round((avgRating || 0) * 10) / 10,
    };
  } catch (error) {
    console.error('Error collecting session metrics:', error);
    return {
      sessions_booked_24h: 0,
      sessions_booked_7d: 0,
      sessions_booked_30d: 0,
      sessions_completed_24h: 0,
      sessions_completed_7d: 0,
      sessions_completed_30d: 0,
      sessions_cancelled_24h: 0,
      sessions_cancelled_7d: 0,
      completion_rate_7d: 0,
      cancellation_rate_7d: 0,
      avg_session_rating: 0,
    };
  }
}

// File upload and sharing metrics
async function getFileMetrics(supabase: any, last24h: Date, last7d: Date, last30d: Date) {
  try {
    // File uploads
    const { data: uploads24h } = await supabase
      .from('files')
      .select('id, size_bytes')
      .gte('created_at', last24h.toISOString());
    
    const { data: uploads7d } = await supabase
      .from('files')
      .select('id, size_bytes')
      .gte('created_at', last7d.toISOString());
    
    // File downloads
    const { data: downloads24h } = await supabase
      .from('download_logs')
      .select('id')
      .gte('downloaded_at', last24h.toISOString());
    
    const { data: downloads7d } = await supabase
      .from('download_logs')
      .select('id')
      .gte('downloaded_at', last7d.toISOString());
    
    // File shares
    const { data: shares7d } = await supabase
      .from('file_shares')
      .select('id')
      .gte('created_at', last7d.toISOString());
    
    // Storage usage
    const totalStorageUsed = uploads7d?.reduce((sum: number, file: any) => 
      sum + (file.size_bytes || 0), 0
    ) || 0;
    
    return {
      files_uploaded_24h: uploads24h?.length || 0,
      files_uploaded_7d: uploads7d?.length || 0,
      files_downloaded_24h: downloads24h?.length || 0,
      files_downloaded_7d: downloads7d?.length || 0,
      files_shared_7d: shares7d?.length || 0,
      total_storage_used_mb: Math.round(totalStorageUsed / (1024 * 1024)),
      avg_file_size_mb: uploads7d?.length ? Math.round(totalStorageUsed / uploads7d.length / (1024 * 1024)) : 0,
    };
  } catch (error) {
    console.error('Error collecting file metrics:', error);
    return {
      files_uploaded_24h: 0,
      files_uploaded_7d: 0,
      files_downloaded_24h: 0,
      files_downloaded_7d: 0,
      files_shared_7d: 0,
      total_storage_used_mb: 0,
      avg_file_size_mb: 0,
    };
  }
}

// Authentication and MFA metrics
async function getAuthMetrics(supabase: any, last24h: Date, last7d: Date, last30d: Date) {
  try {
    // Get auth events from audit logs if available
    const { data: loginAttempts24h } = await supabase
      .from('audit_logs')
      .select('id, event_type')
      .eq('event_type', 'user_login')
      .gte('created_at', last24h.toISOString());
    
    const { data: loginAttempts7d } = await supabase
      .from('audit_logs')
      .select('id, event_type')
      .eq('event_type', 'user_login')
      .gte('created_at', last7d.toISOString());
    
    // MFA adoption rate
    const { data: totalUsers } = await supabase
      .from('profiles')
      .select('id');
    
    const { data: mfaUsers } = await supabase
      .from('user_mfa_settings')
      .select('user_id')
      .eq('is_enabled', true);
    
    const mfaAdoptionRate = totalUsers?.length ? 
      (mfaUsers?.length || 0) / totalUsers.length * 100 : 0;
    
    return {
      login_attempts_24h: loginAttempts24h?.length || 0,
      login_attempts_7d: loginAttempts7d?.length || 0,
      mfa_adoption_rate: Math.round(mfaAdoptionRate * 10) / 10,
      total_users: totalUsers?.length || 0,
      mfa_enabled_users: mfaUsers?.length || 0,
    };
  } catch (error) {
    console.error('Error collecting auth metrics:', error);
    return {
      login_attempts_24h: 0,
      login_attempts_7d: 0,
      mfa_adoption_rate: 0,
      total_users: 0,
      mfa_enabled_users: 0,
    };
  }
}

// Performance metrics
async function getPerformanceMetrics(supabase: any, last24h: Date, last7d: Date, last30d: Date) {
  try {
    // This would typically come from your performance monitoring service
    // For now, we'll return placeholder values that would be populated by
    // your web vitals and API monitoring
    
    return {
      avg_page_load_time_ms: 0, // To be populated by web vitals
      avg_api_response_time_ms: 0, // To be populated by API monitoring
      error_rate_percentage: 0, // To be populated by error tracking
      uptime_percentage: 99.9, // To be populated by health checks
      core_web_vitals: {
        lcp_score: 0, // Largest Contentful Paint
        fid_score: 0, // First Input Delay
        cls_score: 0, // Cumulative Layout Shift
      },
    };
  } catch (error) {
    console.error('Error collecting performance metrics:', error);
    return {
      avg_page_load_time_ms: 0,
      avg_api_response_time_ms: 0,
      error_rate_percentage: 0,
      uptime_percentage: 0,
      core_web_vitals: {
        lcp_score: 0,
        fid_score: 0,
        cls_score: 0,
      },
    };
  }
}

// Helper functions
function calculateRetentionRate(activeUsers: number, newUsers: number): number {
  if (newUsers === 0) return 0;
  return Math.round((activeUsers / newUsers) * 100 * 10) / 10;
}

function calculateCompletionRate(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100 * 10) / 10;
}

function calculateCancellationRate(cancelled: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((cancelled / total) * 100 * 10) / 10;
}