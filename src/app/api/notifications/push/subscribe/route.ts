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
import { PushNotificationService } from '@/lib/services/push-notification-service';

const SubscribeSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string(),
      auth: z.string(),
    }),
  }),
});

// POST /api/notifications/push/subscribe - Subscribe to push notifications
export const POST = withErrorHandling(
  rateLimit(10, 60000)( // 10 subscriptions per minute
    requireAuth(async (user, request: NextRequest, _context: { params: Promise<unknown> }) => {
      try {
        const body = await request.json();
        const validatedData = SubscribeSchema.parse(body);
        
        const pushService = new PushNotificationService(true);
        const subscription = await pushService.subscribeUser(user.id, validatedData.subscription);

        if (!subscription) {
          return createErrorResponse(
            'Failed to create push subscription',
            HTTP_STATUS.INTERNAL_SERVER_ERROR
          );
        }

        return createSuccessResponse(
          { 
            subscriptionId: subscription.id,
            endpoint: subscription.endpoint 
          }, 
          'Successfully subscribed to push notifications'
        );
      } catch (error) {
        if (error instanceof z.ZodError) {
          return createErrorResponse(
            `Invalid subscription data: ${error.errors.map(e => e.message).join(', ')}`,
            HTTP_STATUS.BAD_REQUEST
          );
        }
        throw error;
      }
    })
  )
);

// OPTIONS /api/notifications/push/subscribe - Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handlePreflight(request);
}