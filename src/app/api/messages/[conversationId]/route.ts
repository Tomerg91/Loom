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

// GET /api/messages/[conversationId] - Get messages for a specific conversation
export const GET = withErrorHandling(
  rateLimit(300, 60000)( // 300 requests per minute
    requireAuth(async (user, request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) => {
      const { conversationId } = await params;
      const { searchParams } = request.nextUrl;
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '50');
      const before = searchParams.get('before') || undefined; // For pagination by timestamp
      const search = searchParams.get('search') || undefined;

      if (!conversationId) {
        return createErrorResponse(
          'Conversation ID is required',
          HTTP_STATUS.BAD_REQUEST
        );
      }

      const messagingService = new MessagingService(true);

      try {
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

        // Get messages with pagination
        const [messages, total] = await Promise.all([
          messagingService.getConversationMessages({
            conversationId,
            userId: user.id,
            limit,
            before,
            search,
          }),
          messagingService.getConversationMessagesCount({
            conversationId,
            search,
          }),
        ]);

        // Mark conversation as read for this user
        await messagingService.markConversationAsRead(conversationId, user.id);

        const totalPages = Math.ceil(total / limit);
        const hasNext = messages.length === limit;
        const hasPrev = page > 1;

        return createSuccessResponse({
          data: messages,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext,
            hasPrev,
            before: messages.length > 0 ? messages[messages.length - 1].createdAt : undefined,
          },
        });
      } catch (error) {
        console.error('Error fetching conversation messages:', error);
        return createErrorResponse(
          'Failed to fetch messages',
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
      }
    })
  )
);

// PUT /api/messages/[conversationId] - Update conversation settings (archive, mute, etc.)
export const PUT = withErrorHandling(
  rateLimit(50, 60000)( // 50 requests per minute
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
        const { isArchived, isMuted, title } = body;

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

        // Update conversation participant settings
        const updated = await messagingService.updateConversationParticipant({
          conversationId,
          userId: user.id,
          isArchived,
          isMuted,
        });

        // Update conversation title if provided and user is conversation creator or admin
        if (title !== undefined) {
          await messagingService.updateConversation({
            conversationId,
            userId: user.id,
            title,
          });
        }

        if (!updated) {
          return createErrorResponse(
            'Failed to update conversation',
            HTTP_STATUS.INTERNAL_SERVER_ERROR
          );
        }

        return createSuccessResponse(
          { success: true },
          'Conversation updated successfully'
        );
      } catch (error) {
        console.error('Error updating conversation:', error);
        return createErrorResponse(
          'Failed to update conversation',
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
      }
    })
  )
);

// DELETE /api/messages/[conversationId] - Leave/delete conversation
export const DELETE = withErrorHandling(
  rateLimit(20, 60000)( // 20 requests per minute
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

        // Leave the conversation
        const success = await messagingService.leaveConversation(conversationId, user.id);

        if (!success) {
          return createErrorResponse(
            'Failed to leave conversation',
            HTTP_STATUS.INTERNAL_SERVER_ERROR
          );
        }

        return createSuccessResponse(
          { success: true },
          'Left conversation successfully'
        );
      } catch (error) {
        console.error('Error leaving conversation:', error);
        return createErrorResponse(
          'Failed to leave conversation',
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
      }
    })
  )
);

// OPTIONS /api/messages/[conversationId] - Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handlePreflight(request);
}