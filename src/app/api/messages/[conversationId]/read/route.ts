import { NextRequest } from 'next/server';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  withErrorHandling,
  requireAuth,
  HTTP_STATUS,
  handlePreflight
} from '@/lib/api/utils';
import { MessagingService } from '@/lib/database/messaging';
import { rateLimit } from '@/lib/security/rate-limit';

// POST /api/messages/[conversationId]/read - Mark conversation as read
export const POST = withErrorHandling(
  rateLimit(100, 60000)( // 100 requests per minute
    requireAuth(async (user, request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) => {
      const { conversationId } = await params;

      if (!conversationId) {
        return createErrorResponse(
          'Conversation ID is required',
          HTTP_STATUS.BAD_REQUEST
        );
      }

      try {
        const messagingService = new MessagingService(true);

        // Verify user has access to this conversation
        const hasAccess = await messagingService.userHasConversationAccess(
          user.id,
          conversationId
        );

        if (!hasAccess) {
          return createErrorResponse(
            'Access denied to this conversation',
            HTTP_STATUS.FORBIDDEN
          );
        }

        // Mark conversation as read
        await messagingService.markConversationAsRead(conversationId, user.id);

        return createSuccessResponse(
          { success: true },
          'Conversation marked as read'
        );
      } catch (error) {
        console.error('Error marking conversation as read:', error);
        return createErrorResponse(
          'Failed to mark conversation as read',
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
      }
    })
  )
);

// OPTIONS /api/messages/[conversationId]/read - Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handlePreflight(request);
}