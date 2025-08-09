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

// POST /api/messages/[conversationId]/[messageId]/reactions - Add reaction to message
export const POST = withErrorHandling(
  rateLimit(200, 60000)( // 200 requests per minute
    requireAuth(async (
      user, 
      request: NextRequest, 
      { params }: { params: { conversationId: string; messageId: string } }
    ) => {
      const { conversationId, messageId } = params;

      if (!conversationId || !messageId) {
        return createErrorResponse(
          'Conversation ID and Message ID are required',
          HTTP_STATUS.BAD_REQUEST
        );
      }

      try {
        const body = await request.json();
        const { emoji } = body;

        if (!emoji) {
          return createErrorResponse(
            'Emoji is required',
            HTTP_STATUS.BAD_REQUEST
          );
        }

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

        // Add reaction to message
        const reaction = await messagingService.addMessageReaction({
          messageId,
          userId: user.id,
          emoji,
        });

        if (!reaction) {
          return createErrorResponse(
            'Failed to add reaction',
            HTTP_STATUS.INTERNAL_SERVER_ERROR
          );
        }

        return createSuccessResponse(
          reaction,
          'Reaction added successfully',
          HTTP_STATUS.CREATED
        );
      } catch (error) {
        console.error('Error adding message reaction:', error);
        return createErrorResponse(
          'Failed to add reaction',
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
      }
    })
  )
);

// DELETE /api/messages/[conversationId]/[messageId]/reactions - Remove reaction from message
export const DELETE = withErrorHandling(
  rateLimit(200, 60000)( // 200 requests per minute
    requireAuth(async (
      user, 
      request: NextRequest, 
      { params }: { params: { conversationId: string; messageId: string } }
    ) => {
      const { conversationId, messageId } = params;
      const { searchParams } = request.nextUrl;
      const emoji = searchParams.get('emoji');

      if (!conversationId || !messageId || !emoji) {
        return createErrorResponse(
          'Conversation ID, Message ID, and emoji are required',
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

        // Remove reaction from message
        const success = await messagingService.removeMessageReaction({
          messageId,
          userId: user.id,
          emoji,
        });

        if (!success) {
          return createErrorResponse(
            'Failed to remove reaction',
            HTTP_STATUS.INTERNAL_SERVER_ERROR
          );
        }

        return createSuccessResponse(
          { success: true },
          'Reaction removed successfully'
        );
      } catch (error) {
        console.error('Error removing message reaction:', error);
        return createErrorResponse(
          'Failed to remove reaction',
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
      }
    })
  )
);

// OPTIONS /api/messages/[conversationId]/[messageId]/reactions - Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handlePreflight(request);
}