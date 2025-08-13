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

// POST /api/messages/[conversationId]/typing - Set typing indicator
export const POST = withErrorHandling(
  rateLimit(300, 60000)( // 300 requests per minute (high rate for typing indicators)
    requireAuth(async (user, request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) => {
      const { conversationId } = await params;

      if (!conversationId) {
        return createErrorResponse(
          'Conversation ID is required',
          HTTP_STATUS.BAD_REQUEST
        );
      }

      try {
        const body = await request.json();
        const { typing } = body;

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

        if (typing) {
          // Set typing indicator
          await messagingService.setTypingIndicator(conversationId, user.id);
        } else {
          // Remove typing indicator
          await messagingService.removeTypingIndicator(conversationId, user.id);
        }

        return createSuccessResponse(
          { success: true },
          typing ? 'Typing indicator set' : 'Typing indicator removed'
        );
      } catch (error) {
        console.error('Error managing typing indicator:', error);
        return createErrorResponse(
          'Failed to manage typing indicator',
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
      }
    })
  )
);

// GET /api/messages/[conversationId]/typing - Get typing indicators
export const GET = withErrorHandling(
  rateLimit(300, 60000)( // 300 requests per minute
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

        // Get active typing indicators (excluding current user)
        const typingUsers = await messagingService.getTypingIndicators(conversationId, user.id);

        return createSuccessResponse({
          data: typingUsers,
        });
      } catch (error) {
        console.error('Error fetching typing indicators:', error);
        return createErrorResponse(
          'Failed to fetch typing indicators',
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
      }
    })
  )
);

// OPTIONS /api/messages/[conversationId]/typing - Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handlePreflight(request);
}