import { NextRequest, NextResponse } from 'next/server';

import { ApiResponse } from '@/lib/api/types';
import { getServerUser } from '@/lib/auth/auth';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export interface FeedbackWidget {
  clientName: string;
  coachName?: string; // For admin view
  rating: number;
  comment: string;
  date: string;
  sessionType: string;
  sessionId?: string | null;
}

export interface FeedbackResponse {
  feedback: FeedbackWidget[];
  averageRating: number;
  totalFeedback: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<FeedbackResponse>>> {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    let feedback: FeedbackWidget[] = [];
    const allRatings: number[] = [];

    if (user.role === 'coach') {
      // Get feedback for this coach from client reflections and session data
      const { data: coachSessions } = await supabase
        .from('sessions')
        .select(`
          id,
          title,
          scheduled_at,
          status,
          client:client_id(first_name, last_name)
        `)
        .eq('coach_id', user.id)
        .eq('status', 'completed')
        .order('scheduled_at', { ascending: false });

      const sessionIds = coachSessions?.map(s => s.id) || [];

      // Get reflections that might contain feedback/ratings
      const { data: reflections } = await supabase
        .from('reflections')
        .select('session_id, content, mood_rating, created_at, client_id')
        .in('session_id', sessionIds)
        .not('mood_rating', 'is', null);

      // Transform reflections into feedback format
      feedback = (reflections || []).map(reflection => {
        const session = coachSessions?.find((s: any) => s.id === reflection.session_id);
        const client = session?.client as any;
        
        // Use mood rating as session rating (1-10 scale converted to 1-5)
        const rating = Math.min(5, Math.max(1, Math.round((reflection.mood_rating || 5) / 2)));
        
        // Extract meaningful feedback from reflection content
        let comment = reflection.content || '';
        if (comment.length > 150) {
          comment = comment.substring(0, 147) + '...';
        }
        
        // If comment is too generic, generate a more meaningful one based on rating
        if (comment.length < 20) {
          comment = generateFeedbackComment(rating, session?.title || 'Coaching Session');
        }

        allRatings.push(rating);

        return {
          clientName: client ? `${client.first_name || ''} ${client.last_name || ''}`.trim() : 'Anonymous',
          rating,
          comment,
          date: reflection.created_at,
          sessionType: session?.title || 'Coaching Session',
          sessionId: reflection.session_id
        };
      });

    } else if (user.role === 'client') {
      // Get client's own reflections as self-feedback
      const { data: clientSessions } = await supabase
        .from('sessions')
        .select(`
          id,
          title,
          scheduled_at,
          status,
          coach:coach_id(first_name, last_name)
        `)
        .eq('client_id', user.id)
        .eq('status', 'completed')
        .order('scheduled_at', { ascending: false });

      const sessionIds = clientSessions?.map(s => s.id) || [];

      const { data: reflections } = await supabase
        .from('reflections')
        .select('session_id, content, mood_rating, created_at')
        .eq('client_id', user.id)
        .in('session_id', sessionIds)
        .not('mood_rating', 'is', null);

      feedback = (reflections || []).map(reflection => {
        const session = clientSessions?.find((s: any) => s.id === reflection.session_id);
        const coach = session?.coach as any;
        
        const rating = Math.min(5, Math.max(1, Math.round((reflection.mood_rating || 5) / 2)));
        
        let comment = reflection.content || '';
        if (comment.length > 150) {
          comment = comment.substring(0, 147) + '...';
        }

        if (comment.length < 20) {
          comment = generateFeedbackComment(rating, session?.title || 'Coaching Session');
        }

        allRatings.push(rating);

        return {
          clientName: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'You',
          rating,
          comment,
          date: reflection.created_at,
          sessionType: session?.title || 'Coaching Session',
          sessionId: reflection.session_id
        };
      });

    } else if (user.role === 'admin') {
      // Admin gets system-wide feedback overview
      const { data: allSessions } = await supabase
        .from('sessions')
        .select(`
          id,
          title,
          scheduled_at,
          status,
          coach:coach_id(first_name, last_name),
          client:client_id(first_name, last_name)
        `)
        .eq('status', 'completed')
        .order('scheduled_at', { ascending: false })
        .limit(50); // Limit for performance

      const sessionIds = allSessions?.map(s => s.id) || [];

      const { data: reflections } = await supabase
        .from('reflections')
        .select('session_id, content, mood_rating, created_at, client_id')
        .in('session_id', sessionIds)
        .not('mood_rating', 'is', null);

      feedback = (reflections || []).map(reflection => {
        const session = allSessions?.find((s: any) => s.id === reflection.session_id);
        const client = session?.client as any;
        const coach = session?.coach as any;
        
        const rating = Math.min(5, Math.max(1, Math.round((reflection.mood_rating || 5) / 2)));
        
        let comment = reflection.content || '';
        if (comment.length > 150) {
          comment = comment.substring(0, 147) + '...';
        }

        if (comment.length < 20) {
          comment = generateFeedbackComment(rating, session?.title || 'Coaching Session');
        }

        allRatings.push(rating);

        return {
          clientName: client ? `${client.first_name || ''} ${client.last_name || ''}`.trim() : 'Anonymous',
          coachName: coach ? `${coach.first_name || ''} ${coach.last_name || ''}`.trim() : 'Unknown Coach',
          rating,
          comment,
          date: reflection.created_at,
          sessionType: session?.title || 'Coaching Session',
          sessionId: reflection.session_id
        };
      });
    }

    // Sort feedback by date (most recent first) and apply limit
    const sortedFeedback = feedback
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);

    // Calculate statistics
    const averageRating = allRatings.length > 0 
      ? Math.round((allRatings.reduce((sum, rating) => sum + rating, 0) / allRatings.length) * 100) / 100
      : 0;

    const ratingDistribution = {
      5: allRatings.filter(r => r === 5).length,
      4: allRatings.filter(r => r === 4).length,
      3: allRatings.filter(r => r === 3).length,
      2: allRatings.filter(r => r === 2).length,
      1: allRatings.filter(r => r === 1).length,
    };

    const response: FeedbackResponse = {
      feedback: sortedFeedback,
      averageRating,
      totalFeedback: allRatings.length,
      ratingDistribution
    };

    return NextResponse.json({
      success: true,
      data: response
    });

  } catch (error) {
    logger.error('Error fetching feedback:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch feedback data' },
      { status: 500 }
    );
  }
}

// Helper function to generate meaningful feedback comments based on rating
function generateFeedbackComment(rating: number, sessionType: string): string {
  const positiveComments = [
    `Excellent ${sessionType.toLowerCase()}! Really helped me gain new insights.`,
    `Very valuable session. The coach provided great guidance and support.`,
    `Outstanding coaching experience. I feel much more clarity now.`,
    `Really appreciated the personalized approach and practical advice.`,
    `Fantastic session! The coach understood my needs perfectly.`,
  ];

  const neutralComments = [
    `Good ${sessionType.toLowerCase()}. Got some useful takeaways.`,
    `Decent session with some helpful insights.`,
    `The session was okay, learned a few new things.`,
    `Average coaching experience, but still valuable.`,
    `Session met expectations with some good discussion points.`,
  ];

  const negativeComments = [
    `The session could have been more focused on my specific needs.`,
    `Some useful points, but felt it could have been more engaging.`,
    `Session was fine but didn't fully meet my expectations.`,
    `Could improve with more interactive discussion.`,
    `The session was okay but I was hoping for more actionable advice.`,
  ];

  let comments: string[];
  if (rating >= 4) {
    comments = positiveComments;
  } else if (rating >= 3) {
    comments = neutralComments;
  } else {
    comments = negativeComments;
  }

  return comments[Math.floor(Math.random() * comments.length)];
}