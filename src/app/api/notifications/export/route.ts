import { NextRequest } from 'next/server';
import { 
  createErrorResponse, 
  withErrorHandling,
  requireAuth,
  HTTP_STATUS,
  handlePreflight
} from '@/lib/api/utils';
import { NotificationService } from '@/lib/database/notifications';
import { rateLimit } from '@/lib/security/rate-limit';

// GET /api/notifications/export - Export notifications
export const GET = withErrorHandling(
  rateLimit(5, 60000)( // 5 exports per minute
    requireAuth(async (user, request: NextRequest) => {
      const { searchParams } = request.nextUrl;
      const format = searchParams.get('format') || 'json';
      const limit = parseInt(searchParams.get('limit') || '1000');
      const type = searchParams.get('type');
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');

      if (!['json', 'csv'].includes(format)) {
        return createErrorResponse('Invalid format. Supported: json, csv', HTTP_STATUS.BAD_REQUEST);
      }

      if (limit > 10000) {
        return createErrorResponse('Maximum limit is 10,000 notifications', HTTP_STATUS.BAD_REQUEST);
      }

      const notificationService = new NotificationService(true);

      const filters: any = {
        userId: user.id,
        limit,
        sortBy: 'created_at',
        sortOrder: 'desc' as const,
      };

      if (type) filters.type = type;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;

      const notifications = await notificationService.getNotificationsForExport(filters);

      if (format === 'csv') {
        const csvHeaders = [
          'ID',
          'Type',
          'Title',
          'Message',
          'Channel',
          'Priority',
          'Read At',
          'Created At',
          'Data'
        ];

        const csvRows = notifications.map(notification => [
          notification.id,
          notification.type,
          `"${notification.title.replace(/"/g, '""')}"`,
          `"${notification.message.replace(/"/g, '""')}"`,
          notification.channel || 'inapp',
          notification.priority || 'normal',
          notification.readAt || '',
          notification.createdAt,
          `"${JSON.stringify(notification.data || {}).replace(/"/g, '""')}"`,
        ]);

        const csv = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n');

        return new Response(csv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="notifications_export_${new Date().toISOString().split('T')[0]}.csv"`,
          },
        });
      } else {
        const exportData = {
          metadata: {
            exportedAt: new Date().toISOString(),
            userId: user.id,
            totalCount: notifications.length,
            filters: {
              type,
              startDate,
              endDate,
              limit,
            },
          },
          notifications: notifications.map(notification => ({
            id: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            channel: notification.channel || 'inapp',
            priority: notification.priority || 'normal',
            readAt: notification.readAt,
            createdAt: notification.createdAt,
            scheduledFor: notification.scheduledFor,
            actionUrl: notification.actionUrl,
            actionLabel: notification.actionLabel,
            expiresAt: notification.expiresAt,
            data: notification.data,
          })),
        };

        return new Response(JSON.stringify(exportData, null, 2), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="notifications_export_${new Date().toISOString().split('T')[0]}.json"`,
          },
        });
      }
    })
  )
);

// OPTIONS /api/notifications/export - Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handlePreflight(request);
}