import { NextRequest } from 'next/server';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  withErrorHandling,
  requireAuth,
  HTTP_STATUS,
  handlePreflight
} from '@/lib/api/utils';
import { createServerClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/security/rate-limit';
import { z } from 'zod';

const AnalyticsQuerySchema = z.object({
  range: z.enum(['1d', '7d', '30d', '90d']).default('7d'),
  channel: z.enum(['email', 'push', 'inapp']).optional(),
  type: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// GET /api/admin/notifications/analytics - Get notification analytics
export const GET = withErrorHandling(
  rateLimit(60, 60000)( // 60 requests per minute
    requireAuth(async (user, request: NextRequest) => {
      // Check admin permissions
      if (user.role !== 'admin') {
        return createErrorResponse(
          'Access denied. Admin role required.',
          HTTP_STATUS.FORBIDDEN
        );
      }

      try {
        const { searchParams } = request.nextUrl;
        const query = AnalyticsQuerySchema.parse({
          range: searchParams.get('range') || '7d',
          channel: searchParams.get('channel') || undefined,
          type: searchParams.get('type') || undefined,
          startDate: searchParams.get('startDate') || undefined,
          endDate: searchParams.get('endDate') || undefined,
        });

        const supabase = createServerClient();

        // Calculate date range
        let startDate: Date;
        let endDate = new Date();

        if (query.startDate && query.endDate) {
          startDate = new Date(query.startDate);
          endDate = new Date(query.endDate);
        } else {
          const daysMap = {
            '1d': 1,
            '7d': 7,
            '30d': 30,
            '90d': 90,
          };
          const days = daysMap[query.range];
          startDate = new Date();
          startDate.setDate(startDate.getDate() - days);
        }

        // Build base query conditions
        const dateCondition = `created_at >= '${startDate.toISOString()}' AND created_at <= '${endDate.toISOString()}'`;
        const channelCondition = query.channel ? `AND channel = '${query.channel}'` : '';
        const typeCondition = query.type ? `AND type = '${query.type}'` : '';

        // Get overview statistics
        const { data: overviewData } = await supabase.rpc('get_notification_overview_stats', {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          filter_channel: query.channel || null,
          filter_type: query.type || null,
        });

        // Get channel breakdown
        const { data: channelBreakdown } = await supabase
          .from('notification_delivery_logs')
          .select('channel, status')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());

        // Get type breakdown
        const { data: typeBreakdown } = await supabase
          .from('notifications')
          .select(`
            type,
            notification_delivery_logs!inner(status, sent_at, delivered_at, opened_at, clicked_at)
          `)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());

        // Get time series data
        const { data: timeSeriesData } = await supabase.rpc('get_notification_time_series', {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          interval_type: query.range === '1d' ? 'hour' : 'day',
          filter_channel: query.channel || null,
          filter_type: query.type || null,
        });

        // Get top performing notifications
        const { data: topPerforming } = await supabase.rpc('get_top_performing_notifications', {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          limit_count: 10,
        });

        // Get user engagement metrics
        const { data: userEngagement } = await supabase.rpc('get_user_engagement_metrics', {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        });

        // Get delivery issues
        const { data: deliveryIssues } = await supabase
          .from('notification_delivery_logs')
          .select(`
            id,
            notification_id,
            channel,
            status,
            error_message,
            created_at,
            notifications!inner(type, title)
          `)
          .eq('status', 'failed')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .order('created_at', { ascending: false })
          .limit(50);

        // Process channel breakdown
        const channelStats = {
          email: { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, failed: 0 },
          push: { sent: 0, delivered: 0, opened: 0, clicked: 0, failed: 0 },
          inapp: { sent: 0, viewed: 0, clicked: 0, dismissed: 0 },
        };

        channelBreakdown?.forEach(log => {
          const channel = log.channel as keyof typeof channelStats;
          if (!channelStats[channel]) return;

          switch (log.status) {
            case 'sent':
              channelStats[channel].sent = (channelStats[channel].sent || 0) + 1;
              break;
            case 'delivered':
              (channelStats[channel] as any).delivered = ((channelStats[channel] as any).delivered || 0) + 1;
              break;
            case 'opened':
              if (channel === 'inapp') {
                (channelStats[channel] as any).viewed = ((channelStats[channel] as any).viewed || 0) + 1;
              } else {
                (channelStats[channel] as any).opened = ((channelStats[channel] as any).opened || 0) + 1;
              }
              break;
            case 'clicked':
              (channelStats[channel] as any).clicked = ((channelStats[channel] as any).clicked || 0) + 1;
              break;
            case 'bounced':
              if (channel === 'email') {
                (channelStats[channel] as any).bounced = ((channelStats[channel] as any).bounced || 0) + 1;
              }
              break;
            case 'failed':
              (channelStats[channel] as any).failed = ((channelStats[channel] as any).failed || 0) + 1;
              break;
          }
        });

        // Process type breakdown
        const typeStats: Record<string, any> = {};
        typeBreakdown?.forEach(notification => {
          const type = notification.type;
          if (!typeStats[type]) {
            typeStats[type] = {
              sent: 0,
              delivered: 0,
              opened: 0,
              clicked: 0,
              avgOpenTime: 0,
            };
          }

          notification.notification_delivery_logs.forEach((log: any) => {
            typeStats[type].sent++;
            
            if (log.delivered_at) typeStats[type].delivered++;
            if (log.opened_at) typeStats[type].opened++;
            if (log.clicked_at) typeStats[type].clicked++;
            
            // Calculate average open time
            if (log.sent_at && log.opened_at) {
              const openTime = new Date(log.opened_at).getTime() - new Date(log.sent_at).getTime();
              typeStats[type].avgOpenTime = (typeStats[type].avgOpenTime + openTime) / 2;
            }
          });
        });

        // Group delivery issues by error type
        const issueGroups: Record<string, any> = {};
        deliveryIssues?.forEach(issue => {
          const key = `${issue.channel}-${issue.error_message}`;
          if (!issueGroups[key]) {
            issueGroups[key] = {
              id: key,
              type: issue.notifications.type,
              channel: issue.channel,
              error: issue.error_message || 'Unknown error',
              count: 0,
              lastOccurred: issue.created_at,
            };
          }
          
          issueGroups[key].count++;
          if (new Date(issue.created_at) > new Date(issueGroups[key].lastOccurred)) {
            issueGroups[key].lastOccurred = issue.created_at;
          }
        });

        const analytics = {
          overview: overviewData || {
            totalSent: 0,
            totalDelivered: 0,
            totalOpened: 0,
            totalClicked: 0,
            deliveryRate: 0,
            openRate: 0,
            clickRate: 0,
          },
          byChannel: channelStats,
          byType: typeStats,
          timeSeriesData: timeSeriesData || [],
          topPerformingNotifications: topPerforming || [],
          userEngagement: userEngagement || {
            activeUsers: 0,
            engagedUsers: 0,
            unsubscribeRate: 0,
            avgNotificationsPerUser: 0,
          },
          deliveryIssues: Object.values(issueGroups),
        };

        return createSuccessResponse(analytics);
      } catch (error) {
        console.error('Error fetching notification analytics:', error);
        
        if (error instanceof z.ZodError) {
          return createErrorResponse(
            `Invalid query parameters: ${error.errors.map(e => e.message).join(', ')}`,
            HTTP_STATUS.BAD_REQUEST
          );
        }

        return createErrorResponse(
          'Failed to fetch notification analytics',
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
      }
    })
  )
);

// OPTIONS /api/admin/notifications/analytics - Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handlePreflight(request);
}