/**
 * Messaging Analytics API
 * Get messaging engagement metrics
 */

import { NextResponse } from 'next/server';

import { authService } from '@/lib/services/auth-service';
import { createClient } from '@/lib/supabase/server';

// GET /api/analytics/messaging - Get user's messaging analytics
export async function GET(request: Request) {
  try {
    const user = await authService.getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
    const scope = searchParams.get('scope') || 'user'; // 'user', 'overall', 'conversation'
    const conversationId = searchParams.get('conversationId');

    let data, error;

    switch (scope) {
      case 'overall':
        // Only admins can view overall analytics
        if (user.role !== 'admin') {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        ({ data, error } = await supabase.rpc('get_overall_messaging_analytics', {
          p_start_date: startDate,
          p_end_date: endDate,
        }));
        break;

      case 'conversation':
        if (!conversationId) {
          return NextResponse.json(
            { error: 'Conversation ID required for conversation scope' },
            { status: 400 }
          );
        }

        // Verify user has access to this conversation
        const { data: participant } = await supabase
          .from('conversation_participants')
          .select('id')
          .eq('conversation_id', conversationId)
          .eq('user_id', user.id)
          .single();

        if (!participant && user.role !== 'admin') {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        ({ data, error } = await supabase.rpc('get_conversation_analytics', {
          p_conversation_id: conversationId,
          p_start_date: startDate,
          p_end_date: endDate,
        }));
        break;

      case 'user':
      default:
        ({ data, error } = await supabase.rpc('get_user_messaging_analytics', {
          p_user_id: user.id,
          p_start_date: startDate,
          p_end_date: endDate,
        }));
        break;
    }

    if (error) throw error;

    // Calculate summary statistics
    const summary = calculateSummaryStats(data || []);

    return NextResponse.json({
      data: data || [],
      summary,
      period: {
        startDate,
        endDate,
      },
    });
  } catch (error) {
    console.error('Failed to fetch messaging analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

function calculateSummaryStats(data: any[]) {
  if (!data || data.length === 0) {
    return {
      totalMessages: 0,
      totalRead: 0,
      totalReactions: 0,
      totalReplies: 0,
      avgResponseTime: 0,
      readRate: 0,
      replyRate: 0,
    };
  }

  const totalMessages = data.reduce((sum, day) => sum + (Number(day.messages_sent) || Number(day.total_messages) || 0), 0);
  const totalRead = data.reduce((sum, day) => sum + (Number(day.messages_read) || 0), 0);
  const totalReactions = data.reduce((sum, day) => sum + (Number(day.reactions_added) || Number(day.total_reactions) || 0), 0);
  const totalReplies = data.reduce((sum, day) => sum + (Number(day.replies_sent) || Number(day.total_replies) || 0), 0);

  // Calculate average response time (weighted by number of reads)
  let totalResponseTime = 0;
  let totalReadsWithResponseTime = 0;

  data.forEach(day => {
    if (day.avg_response_time_seconds) {
      const reads = Number(day.messages_read) || 0;
      totalResponseTime += day.avg_response_time_seconds * reads;
      totalReadsWithResponseTime += reads;
    }
  });

  const avgResponseTime = totalReadsWithResponseTime > 0
    ? Math.round(totalResponseTime / totalReadsWithResponseTime)
    : 0;

  const readRate = totalMessages > 0 ? (totalRead / totalMessages * 100).toFixed(1) : '0';
  const replyRate = totalMessages > 0 ? (totalReplies / totalMessages * 100).toFixed(1) : '0';

  return {
    totalMessages,
    totalRead,
    totalReactions,
    totalReplies,
    avgResponseTime,
    readRate: parseFloat(readRate),
    replyRate: parseFloat(replyRate),
  };
}
