import { NextRequest } from 'next/server';

import { 
  createSuccessResponse, 
  createErrorResponse, 
  withErrorHandling,
  requireAuth,
  HTTP_STATUS,
  handlePreflight
} from '@/lib/api/utils';
import { rateLimit } from '@/lib/security/rate-limit';
import { PushNotificationService } from '@/lib/services/push-notification-service';
import { logger } from '@/lib/logger';

// POST /api/notifications/push/unsubscribe - Unsubscribe from push notifications
export const POST = withErrorHandling(
  rateLimit(10, 60000)( // 10 unsubscriptions per minute
    requireAuth(async (user, request: NextRequest, context: { params: Promise<{}> }) => {
      try {
        const body = await request.json();
        const endpoint = body.endpoint; // Optional - if provided, only unsubscribe specific endpoint

        const pushService = new PushNotificationService(true);
        const success = await pushService.unsubscribeUser(user.id, endpoint);

        if (!success) {
          return createErrorResponse(
            'Failed to unsubscribe from push notifications',
            HTTP_STATUS.INTERNAL_SERVER_ERROR
          );
        }

        return createSuccessResponse(
          { unsubscribed: true }, 
          'Successfully unsubscribed from push notifications'
        );
      } catch (error) {
        logger.error('Error unsubscribing from push notifications:', error);
        return createErrorResponse(
          'Failed to unsubscribe from push notifications',
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
      }
    })
  )
);

// OPTIONS /api/notifications/push/unsubscribe - Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handlePreflight(request);
}