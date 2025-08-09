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

// GET /api/messages - Get conversations list with last message and unread count
export const GET = withErrorHandling(
  rateLimit(200, 60000)( // 200 requests per minute
    requireAuth(async (user, request: NextRequest) => {
      const { searchParams } = request.nextUrl;
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');
      const search = searchParams.get('search') || undefined;
      const includeArchived = searchParams.get('includeArchived') === 'true';

      const offset = (page - 1) * limit;

      const messagingService = new MessagingService(true);

      try {
        // Get conversations with last message and unread counts
        const [conversations, total] = await Promise.all([
          messagingService.getUserConversations({
            userId: user.id,
            limit,
            offset,
            search,
            includeArchived,
          }),
          messagingService.getUserConversationsCount({
            userId: user.id,
            search,
            includeArchived,
          }),
        ]);

        const totalPages = Math.ceil(total / limit);
        const hasNext = page < totalPages;
        const hasPrev = page > 1;

        return createSuccessResponse({
          data: conversations,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext,
            hasPrev,
          },
        });
      } catch (error) {
        console.error('Error fetching conversations:', error);
        return createErrorResponse(
          'Failed to fetch conversations',
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
      }
    })
  )
);

// POST /api/messages - Send a new message or create a new conversation
export const POST = withErrorHandling(
  rateLimit(100, 60000)( // 100 requests per minute
    requireAuth(async (user, request: NextRequest) => {
      try {
        const body = await request.json();
        const {
          conversationId,
          recipientId,
          content,
          type = 'text',
          replyToId,
          attachments = [],
        } = body;

        // Validate required fields
        if (!content && (!attachments || attachments.length === 0)) {
          return createErrorResponse(
            'Message content or attachments are required',
            HTTP_STATUS.BAD_REQUEST
          );
        }

        if (!conversationId && !recipientId) {
          return createErrorResponse(
            'Either conversationId or recipientId is required',
            HTTP_STATUS.BAD_REQUEST
          );
        }

        const messagingService = new MessagingService(true);

        let targetConversationId = conversationId;

        // If no conversation ID provided, create or get direct conversation
        if (!targetConversationId && recipientId) {
          // Verify user can message the recipient
          const canMessage = await messagingService.canUserMessageUser(user.id, recipientId);
          if (!canMessage) {
            return createErrorResponse(
              'You are not authorized to message this user',
              HTTP_STATUS.FORBIDDEN
            );
          }

          targetConversationId = await messagingService.getOrCreateDirectConversation(
            user.id,
            recipientId
          );
        }

        // Send the message
        const message = await messagingService.sendMessage({
          conversationId: targetConversationId,
          senderId: user.id,
          content,
          type,
          replyToId,
          attachments,
        });

        if (!message) {
          return createErrorResponse(
            'Failed to send message',
            HTTP_STATUS.INTERNAL_SERVER_ERROR
          );
        }

        return createSuccessResponse(
          message,
          'Message sent successfully',
          HTTP_STATUS.CREATED
        );
      } catch (error) {
        console.error('Error sending message:', error);
        return createErrorResponse(
          'Failed to send message',
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
      }
    })
  )
);

// OPTIONS /api/messages - Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handlePreflight(request);
}