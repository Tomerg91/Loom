/**
 * Admin Message Moderation API
 * Allows admins to view, moderate, and manage messages
 */

import { NextResponse } from 'next/server';

import { authService } from '@/lib/services/auth-service';
import { createClient } from '@/lib/supabase/server';

// GET /api/admin/messages - Get all messages with filtering
export async function GET(request: Request) {
  try {
    const user = await authService.getCurrentUser();

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const conversationId = searchParams.get('conversationId');
    const userId = searchParams.get('userId');
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const onlyArchived = searchParams.get('onlyArchived') === 'true';

    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('messages')
      .select(`
        id,
        conversation_id,
        sender_id,
        reply_to_id,
        type,
        content,
        metadata,
        status,
        is_edited,
        is_archived,
        archived_at,
        edited_at,
        delivered_at,
        created_at,
        updated_at,
        sender:users!messages_sender_id_fkey(
          id,
          email,
          first_name,
          last_name,
          avatar_url,
          role
        ),
        conversation:conversations!messages_conversation_id_fkey(
          id,
          type,
          title,
          created_by
        ),
        reactions:message_reactions(count),
        attachments:message_attachments(count)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (conversationId) {
      query = query.eq('conversation_id', conversationId);
    }

    if (userId) {
      query = query.eq('sender_id', userId);
    }

    if (search) {
      query = query.ilike('content', `%${search}%`);
    }

    if (onlyArchived) {
      query = query.eq('is_archived', true);
    } else if (!includeArchived) {
      query = query.eq('is_archived', false);
    }

    // Get total count
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('is_archived', onlyArchived);

    // Get paginated results
    const { data: messages, error } = await query.range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      data: messages || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Failed to fetch messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/messages - Delete a message (admin only)
export async function DELETE(request: Request) {
  try {
    const user = await authService.getCurrentUser();

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      );
    }

    // Delete in order: attachments, reactions, read receipts, then message
    await supabase.from('message_attachments').delete().eq('message_id', messageId);
    await supabase.from('message_reactions').delete().eq('message_id', messageId);
    await supabase.from('message_read_receipts').delete().eq('message_id', messageId);

    const { error } = await supabase.from('messages').delete().eq('id', messageId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete message:', error);
    return NextResponse.json(
      { error: 'Failed to delete message' },
      { status: 500 }
    );
  }
}
