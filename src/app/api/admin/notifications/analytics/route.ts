import { NextRequest } from 'next/server';
import { z } from 'zod';

import { 
  createSuccessResponse, 
  createErrorResponse, 
  withErrorHandling,
  requireAuth,
  HTTP_STATUS,
  handlePreflight
} from '@/lib/api/utils';
import { rateLimit } from '@/lib/security/rate-limit';
import { createServerClient } from '@/lib/supabase/server';

const AnalyticsQuerySchema = z.object({
  range: z.enum(['1d', '7d', '30d', '90d']).default('7d'),
  channel: z.enum(['email', 'push', 'inapp']).optional(),
  type: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// Helper function to generate time series data
function generateTimeSeriesData(notifications: any[], startDate: Date, endDate: Date, range: string) {
  const intervalHours = range === '1d' ? 1 : 24;
  const data = [];
  
  const current = new Date(startDate);
  while (current <= endDate) {
    const intervalEnd = new Date(current);
    intervalEnd.setHours(intervalEnd.getHours() + intervalHours);
    
    const intervalNotifications = notifications.filter(n => {
      const createdAt = new Date(n.created_at);
      return createdAt >= current && createdAt < intervalEnd;
    });
    
    data.push({
      timestamp: current.toISOString(),
      sent: intervalNotifications.length,
      delivered: intervalNotifications.filter(n => n.sent_at).length,
      opened: intervalNotifications.filter(n => n.read_at).length,
    });
    
    current.setHours(current.getHours() + intervalHours);
  }
  
  return data;
}

// GET /api/admin/notifications/analytics - Get notification analytics
export const GET = withErrorHandling(
  rateLimit(60, 60000)( // 60 requests per minute
    requireAuth(async (user, request: NextRequest, _context: { params: Promise<{}> }) => {
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
        const _dateCondition = `created_at >= '${startDate.toISOString()}' AND created_at <= '${endDate.toISOString()}'`;
        const _channelCondition = query.channel ? `AND channel = '${query.channel}'` : '';
        const _typeCondition = query.type ? `AND type = '${query.type}'` : '';

        // Get overview statistics from existing notifications table
        const { data: allNotifications, error: notificationsError } = await supabase
          .from('notifications')
          .select('*')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());

        if (notificationsError) {
          console.error('Error fetching notifications:', notificationsError);
          throw new Error('Failed to fetch notifications data');
        }

        // Calculate overview stats
        const totalSent = allNotifications?.length || 0;
        const totalRead = allNotifications?.filter(n => n.read_at)?.length || 0;
        const totalSentOut = allNotifications?.filter(n => n.sent_at)?.length || 0;
        
        const overviewData = {
          totalSent,
          totalDelivered: totalSentOut,
          totalOpened: totalRead,
          totalClicked: 0, // Not tracked in current schema
          deliveryRate: totalSent > 0 ? (totalSentOut / totalSent) * 100 : 0,
          openRate: totalSentOut > 0 ? (totalRead / totalSentOut) * 100 : 0,
          clickRate: 0, // Not tracked in current schema
        };

        // Channel breakdown - simulate based on notification type
        const channelBreakdown = allNotifications?.map(notification => ({
          channel: notification.type.includes('session') ? 'email' : 'inapp',
          status: notification.sent_at ? (notification.read_at ? 'opened' : 'delivered') : 'sent'
        })) || [];

        // Type breakdown from existing notifications
        const typeBreakdown = allNotifications?.map(notification => ({
          type: notification.type,
          notification_delivery_logs: [{
            status: notification.sent_at ? (notification.read_at ? 'opened' : 'delivered') : 'sent',
            sent_at: notification.sent_at,
            delivered_at: notification.sent_at,
            opened_at: notification.read_at,
            clicked_at: null
          }]
        })) || [];

        // Generate time series data
        const timeSeriesData = generateTimeSeriesData(allNotifications || [], startDate, endDate, query.range);

        // Calculate top performing notifications based on read rate
        const notificationPerformance: Record<string, any> = {};
        allNotifications?.forEach(notification => {
          const key = `${notification.type}-${notification.title}`;
          if (!notificationPerformance[key]) {
            notificationPerformance[key] = {
              title: notification.title,
              type: notification.type,
              sent: 0,
              opened: 0,
              openRate: 0
            };
          }
          notificationPerformance[key].sent += 1;
          if (notification.read_at) {
            notificationPerformance[key].opened += 1;
          }
        });
        
        const topPerforming = Object.values(notificationPerformance)
          .map((perf: any) => ({ ...perf, openRate: perf.sent > 0 ? (perf.opened / perf.sent) * 100 : 0 }))
          .sort((a: any, b: any) => b.openRate - a.openRate)
          .slice(0, 10);

        // Calculate user engagement metrics
        const uniqueUsers = new Set(allNotifications?.map(n => n.user_id) || []).size;
        const engagedUsers = new Set(
          allNotifications?.filter(n => n.read_at)?.map(n => n.user_id) || []
        ).size;
        
        const userEngagement = {
          activeUsers: uniqueUsers,
          engagedUsers,
          unsubscribeRate: 0, // Not tracked in current schema
          avgNotificationsPerUser: uniqueUsers > 0 ? totalSent / uniqueUsers : 0,
        };

        // Simulate delivery issues - notifications that were scheduled but never sent
        const deliveryIssues = allNotifications
          ?.filter(n => !n.sent_at && new Date(n.scheduled_for) < new Date())
          ?.slice(0, 50)
          ?.map(n => ({
            id: n.id,
            notification_id: n.id,
            channel: n.type.includes('session') ? 'email' : 'inapp',
            status: 'failed',
            error_message: 'Scheduled notification not sent',
            created_at: n.created_at,
            notifications: { type: n.type, title: n.title }
          })) || [];

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
          query: {
            range: query.range,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            channel: query.channel,
            type: query.type
          },
          overview: overviewData,
          byChannel: channelStats,
          byType: typeStats,
          timeSeriesData: timeSeriesData,
          topPerformingNotifications: topPerforming,
          userEngagement: userEngagement,
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