import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';
import type {
  Conversation,
  Message,
  MessageReaction,
  MessageAttachment,
  ConversationType,
  MessageType,
  MessageStatus,
  AttachmentType,
} from '@/types';

interface SendMessageParams {
  conversationId: string;
  senderId: string;
  content: string;
  type?: MessageType;
  replyToId?: string;
  attachments?: Array<{
    fileName: string;
    fileSize: number;
    fileType: string;
    attachmentType: AttachmentType;
    url: string;
    thumbnailUrl?: string;
    metadata?: Record<string, unknown>;
  }>;
}

interface GetUserConversationsParams {
  userId: string;
  limit: number;
  offset: number;
  search?: string;
  includeArchived?: boolean;
}

interface GetConversationMessagesParams {
  conversationId: string;
  userId: string;
  limit: number;
  before?: string; // ISO timestamp
  search?: string;
}

interface UpdateConversationParticipantParams {
  conversationId: string;
  userId: string;
  isArchived?: boolean;
  isMuted?: boolean;
}

interface UpdateConversationParams {
  conversationId: string;
  userId: string;
  title?: string;
}

export class MessagingService {
  private supabase: ReturnType<typeof createClient>;

  constructor(private isServer: boolean = false) {
    this.supabase = createClient(isServer);
  }

  // Conversation Management
  async getUserConversations(params: GetUserConversationsParams) {
    const { userId, limit, offset, search, includeArchived = false } = params;

    let query = this.supabase
      .from('conversations')
      .select(`
        *,
        conversation_participants!inner (
          user_id,
          is_archived,
          is_muted,
          last_read_at
        ),
        messages (
          id,
          content,
          type,
          created_at,
          sender_id,
          users!messages_sender_id_fkey (
            id,
            first_name,
            last_name,
            avatar_url
          )
        )
      `)
      .eq('conversation_participants.user_id', userId)
      .order('last_message_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (!includeArchived) {
      query = query.eq('conversation_participants.is_archived', false);
    }

    if (search) {
      // Search in conversation participants' names or message content
      query = query.or(
        `title.ilike.%${search}%,messages.content.ilike.%${search}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching user conversations:', error);
      throw error;
    }

    // Process conversations to include other participants and unread counts
    const processedConversations = await Promise.all(
      data?.map(async (conversation: any) => {
        // Get other participants
        const { data: participants } = await this.supabase
          .from('conversation_participants')
          .select(`
            user_id,
            users (
              id,
              first_name,
              last_name,
              avatar_url,
              role,
              last_seen_at
            )
          `)
          .eq('conversation_id', conversation.id)
          .neq('user_id', userId)
          .is('left_at', null);

        // Get unread count
        const unreadCount = await this.getUnreadMessageCount(conversation.id, userId);

        // Get the last message
        const { data: lastMessage } = await this.supabase
          .from('messages')
          .select(`
            *,
            users!messages_sender_id_fkey (
              id,
              first_name,
              last_name,
              avatar_url
            )
          `)
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        return {
          ...conversation,
          participants: participants?.map((p: any) => p.users) || [],
          unreadCount,
          lastMessage,
        };
      }) || []
    );

    return processedConversations as Conversation[];
  }

  async getUserConversationsCount(params: Omit<GetUserConversationsParams, 'limit' | 'offset'>) {
    const { userId, search, includeArchived = false } = params;

    let query = this.supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_participants.user_id', userId);

    if (!includeArchived) {
      query = query.eq('conversation_participants.is_archived', false);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%`);
    }

    const { count, error } = await query;

    if (error) {
      console.error('Error counting user conversations:', error);
      throw error;
    }

    return count || 0;
  }

  async getConversationMessages(params: GetConversationMessagesParams) {
    const { conversationId, userId, limit, before, search } = params;

    let query = this.supabase
      .from('messages')
      .select(`
        *,
        users!messages_sender_id_fkey (
          id,
          first_name,
          last_name,
          avatar_url,
          role
        ),
        message_reactions (
          id,
          emoji,
          user_id,
          users (
            id,
            first_name,
            last_name
          )
        ),
        message_attachments (
          *
        ),
        reply_to:messages!messages_reply_to_id_fkey (
          id,
          content,
          type,
          created_at,
          users!messages_sender_id_fkey (
            id,
            first_name,
            last_name
          )
        )
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    if (search) {
      query = query.ilike('content', `%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching conversation messages:', error);
      throw error;
    }

    // Reverse to show oldest first in UI
    return (data?.reverse() || []) as Message[];
  }

  async getConversationMessagesCount(params: { conversationId: string; search?: string }) {
    const { conversationId, search } = params;

    let query = this.supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId);

    if (search) {
      query = query.ilike('content', `%${search}%`);
    }

    const { count, error } = await query;

    if (error) {
      console.error('Error counting conversation messages:', error);
      throw error;
    }

    return count || 0;
  }

  // Message Operations
  async sendMessage(params: SendMessageParams) {
    const { conversationId, senderId, content, type = 'text', replyToId, attachments } = params;

    try {
      // Insert message
      const { data: message, error: messageError } = await this.supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content,
          type,
          reply_to_id: replyToId,
          status: 'sent' as MessageStatus,
        })
        .select(`
          *,
          users!messages_sender_id_fkey (
            id,
            first_name,
            last_name,
            avatar_url,
            role
          )
        `)
        .single();

      if (messageError) {
        console.error('Error inserting message:', messageError);
        throw messageError;
      }

      // Insert attachments if provided
      if (attachments && attachments.length > 0) {
        const { error: attachmentError } = await this.supabase
          .from('message_attachments')
          .insert(
            attachments.map((attachment) => ({
              message_id: message.id,
              file_name: attachment.fileName,
              file_size: attachment.fileSize,
              file_type: attachment.fileType,
              attachment_type: attachment.attachmentType,
              url: attachment.url,
              thumbnail_url: attachment.thumbnailUrl,
              metadata: attachment.metadata || {},
            }))
          );

        if (attachmentError) {
          console.error('Error inserting attachments:', attachmentError);
          // Don't throw here, message is already sent
        }
      }

      return message as Message;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async markConversationAsRead(conversationId: string, userId: string) {
    try {
      // Use the database function for efficient read marking
      const { error } = await this.supabase.rpc('mark_conversation_as_read', {
        p_conversation_id: conversationId,
        p_user_id: userId,
      });

      if (error) {
        console.error('Error marking conversation as read:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error marking conversation as read:', error);
      throw error;
    }
  }

  async getUnreadMessageCount(conversationId: string, userId: string): Promise<number> {
    try {
      const { data, error } = await this.supabase.rpc('get_unread_message_count', {
        p_conversation_id: conversationId,
        p_user_id: userId,
      });

      if (error) {
        console.error('Error getting unread message count:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Error getting unread message count:', error);
      return 0;
    }
  }

  // Conversation Access and Management
  async userHasConversationAccess(userId: string, conversationId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('conversation_participants')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
        .is('left_at', null)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error checking conversation access:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking conversation access:', error);
      return false;
    }
  }

  async canUserMessageUser(senderId: string, recipientId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.rpc('can_user_message_user', {
        sender_id: senderId,
        recipient_id: recipientId,
      });

      if (error) {
        console.error('Error checking if user can message user:', error);
        return false;
      }

      return data || false;
    } catch (error) {
      console.error('Error checking if user can message user:', error);
      return false;
    }
  }

  async getOrCreateDirectConversation(user1Id: string, user2Id: string): Promise<string> {
    try {
      const { data, error } = await this.supabase.rpc('get_or_create_direct_conversation', {
        p_user1_id: user1Id,
        p_user2_id: user2Id,
      });

      if (error) {
        console.error('Error getting or creating direct conversation:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error getting or creating direct conversation:', error);
      throw error;
    }
  }

  async updateConversationParticipant(params: UpdateConversationParticipantParams) {
    const { conversationId, userId, isArchived, isMuted } = params;

    try {
      const updates: any = {};
      if (isArchived !== undefined) updates.is_archived = isArchived;
      if (isMuted !== undefined) updates.is_muted = isMuted;

      const { error } = await this.supabase
        .from('conversation_participants')
        .update(updates)
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating conversation participant:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error updating conversation participant:', error);
      throw error;
    }
  }

  async updateConversation(params: UpdateConversationParams) {
    const { conversationId, userId, title } = params;

    try {
      const updates: any = {};
      if (title !== undefined) updates.title = title;

      const { error } = await this.supabase
        .from('conversations')
        .update(updates)
        .eq('id', conversationId)
        .eq('created_by', userId); // Only creator can update conversation details

      if (error) {
        console.error('Error updating conversation:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error updating conversation:', error);
      throw error;
    }
  }

  async leaveConversation(conversationId: string, userId: string) {
    try {
      const { error } = await this.supabase
        .from('conversation_participants')
        .update({ left_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error leaving conversation:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error leaving conversation:', error);
      throw error;
    }
  }

  // Message Reactions
  async addMessageReaction(params: {
    messageId: string;
    userId: string;
    emoji: string;
  }) {
    const { messageId, userId, emoji } = params;

    try {
      const { data, error } = await this.supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: userId,
          emoji,
        })
        .select(`
          *,
          users (
            id,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .single();

      if (error) {
        console.error('Error adding message reaction:', error);
        throw error;
      }

      return data as MessageReaction;
    } catch (error) {
      console.error('Error adding message reaction:', error);
      throw error;
    }
  }

  async removeMessageReaction(params: {
    messageId: string;
    userId: string;
    emoji: string;
  }) {
    const { messageId, userId, emoji } = params;

    try {
      const { error } = await this.supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', userId)
        .eq('emoji', emoji);

      if (error) {
        console.error('Error removing message reaction:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error removing message reaction:', error);
      throw error;
    }
  }

  // Typing Indicators
  async setTypingIndicator(conversationId: string, userId: string) {
    try {
      const { error } = await this.supabase
        .from('typing_indicators')
        .upsert({
          conversation_id: conversationId,
          user_id: userId,
          started_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 10000).toISOString(), // 10 seconds
        });

      if (error) {
        console.error('Error setting typing indicator:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error setting typing indicator:', error);
      throw error;
    }
  }

  async removeTypingIndicator(conversationId: string, userId: string) {
    try {
      const { error } = await this.supabase
        .from('typing_indicators')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error removing typing indicator:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error removing typing indicator:', error);
      throw error;
    }
  }

  async getTypingIndicators(conversationId: string, excludeUserId: string) {
    try {
      // Clean up expired indicators first
      await this.supabase.rpc('cleanup_expired_typing_indicators');

      const { data, error } = await this.supabase
        .from('typing_indicators')
        .select(`
          *,
          users (
            id,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('conversation_id', conversationId)
        .neq('user_id', excludeUserId)
        .gt('expires_at', new Date().toISOString());

      if (error) {
        console.error('Error getting typing indicators:', error);
        throw error;
      }

      return data?.map((indicator: any) => indicator.users) || [];
    } catch (error) {
      console.error('Error getting typing indicators:', error);
      throw error;
    }
  }
}