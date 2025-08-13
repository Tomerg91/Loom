import { NextRequest } from 'next/server';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  withErrorHandling,
  requireAuth,
  HTTP_STATUS,
  handlePreflight
} from '@/lib/api/utils';
import { NotificationService } from '@/lib/database/notifications';
import { rateLimit } from '@/lib/security/rate-limit';
import { z } from 'zod';

const BulkActionSchema = z.object({
  action: z.enum(['mark_read', 'delete', 'archive']),
  notificationIds: z.array(z.string().uuid()).min(1).max(100), // Limit to 100 items
});

// POST /api/notifications/bulk-actions - Perform bulk actions on notifications
export const POST = withErrorHandling(
  rateLimit(30, 60000)( // 30 requests per minute for bulk operations
    requireAuth(async (user, request: NextRequest, context: { params: Promise<{}> }) => {
      try {
        const body = await request.json();
        const validatedData = BulkActionSchema.parse(body);
        const { action, notificationIds } = validatedData;

        const notificationService = new NotificationService(true);

        // Verify all notifications belong to the user
        const userNotifications = await notificationService.getNotificationsByIds(notificationIds, user.id);
        
        if (userNotifications.length !== notificationIds.length) {
          return createErrorResponse(
            'Some notifications not found or access denied',
            HTTP_STATUS.BAD_REQUEST
          );
        }

        let result;
        let message = '';

        switch (action) {
          case 'mark_read':
            result = await notificationService.markMultipleAsRead(notificationIds, user.id);
            message = `Marked ${result.count} notification${result.count !== 1 ? 's' : ''} as read`;
            break;

          case 'delete':
            result = await notificationService.deleteMultiple(notificationIds, user.id);
            message = `Deleted ${result.count} notification${result.count !== 1 ? 's' : ''}`;
            break;

          case 'archive':
            result = await notificationService.archiveMultiple(notificationIds, user.id);
            message = `Archived ${result.count} notification${result.count !== 1 ? 's' : ''}`;
            break;

          default:
            return createErrorResponse('Invalid action', HTTP_STATUS.BAD_REQUEST);
        }

        return createSuccessResponse(
          { 
            action, 
            processed: result.count,
            notificationIds: result.processedIds || notificationIds
          }, 
          message
        );

      } catch (error) {
        if (error instanceof z.ZodError) {
          return createErrorResponse(
            `Invalid request: ${error.errors.map(e => e.message).join(', ')}`,
            HTTP_STATUS.BAD_REQUEST
          );
        }
        throw error;
      }
    })
  )
);

// OPTIONS /api/notifications/bulk-actions - Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handlePreflight(request);
}