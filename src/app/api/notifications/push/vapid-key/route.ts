import { NextRequest } from 'next/server';

import { 
  createSuccessResponse, 
  createErrorResponse, 
  withErrorHandling,
  HTTP_STATUS,
  handlePreflight
} from '@/lib/api/utils';
import { PushNotificationService } from '@/lib/services/push-notification-service';
import { logger } from '@/lib/logger';

// GET /api/notifications/push/vapid-key - Get VAPID public key
export const GET = withErrorHandling(async (request: NextRequest) => {
  try {
    const pushService = new PushNotificationService(true);
    const vapidPublicKey = pushService.getVapidPublicKey();

    if (!vapidPublicKey) {
      return createErrorResponse(
        'VAPID public key not configured',
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }

    return createSuccessResponse({ vapidPublicKey });
  } catch (error) {
    logger.error('Error getting VAPID public key:', error);
    return createErrorResponse(
      'Failed to get VAPID public key',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
});

// OPTIONS /api/notifications/push/vapid-key - Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handlePreflight(request);
}