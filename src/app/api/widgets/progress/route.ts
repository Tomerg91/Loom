import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth/auth';
import { createClient } from '@/lib/supabase/server';
import { ApiResponse } from '@/lib/api/types';

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  completedDate?: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  status: 'not_started' | 'in_progress' | 'completed' | 'paused';
  progress: number;
  targetDate: string;
  createdDate: string;
  milestones: Milestone[];
}

export interface ProgressResponse {
  goals: Goal[];
  totalGoals: number;
  completedGoals: number;
  inProgressGoals: number;
}

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<ProgressResponse>>> {
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
    const status = searchParams.get('status');

    // Create dynamic goals based on user data and activities
    const goals: Goal[] = [];

    if (user.role === 'client') {
      // Get client's sessions and reflections to create personalized goals
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('id, scheduled_at, status, title')
        .eq('client_id', user.id)
        .order('scheduled_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      const { data: reflections, error: reflectionsError } = await supabase
        .from('reflections')
        .select('id, created_at, mood_rating, content')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });

      if (reflectionsError) throw reflectionsError;

      const completedSessions = sessions?.filter(s => s.status === 'completed') || [];
      const upcomingSessions = sessions?.filter(s => s.status === 'scheduled') || [];
      const reflectionCount = reflections?.length || 0;

      // Session consistency goal
      const sessionGoalProgress = Math.min((completedSessions.length / 10) * 100, 100);
      goals.push({
        id: 'session-consistency',
        title: 'Attend 10 Coaching Sessions',
        description: 'Build consistency by attending regular coaching sessions',
        category: 'Sessions',
        priority: 'high',
        status: completedSessions.length >= 10 ? 'completed' : 'in_progress',
        progress: sessionGoalProgress,
        targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days from now
        createdDate: user.createdAt || new Date().toISOString(),
        milestones: [
          {
            id: 'first-session',
            title: 'Complete first session',
            completed: completedSessions.length >= 1,
            completedDate: completedSessions[completedSessions.length - 1]?.scheduled_at
          },
          {
            id: 'five-sessions',
            title: 'Complete 5 sessions',
            completed: completedSessions.length >= 5,
            completedDate: completedSessions.length >= 5 ? completedSessions[completedSessions.length - 5]?.scheduled_at : undefined
          },
          {
            id: 'ten-sessions',
            title: 'Complete 10 sessions',
            completed: completedSessions.length >= 10,
            completedDate: completedSessions.length >= 10 ? completedSessions[completedSessions.length - 10]?.scheduled_at : undefined
          }
        ]
      });

      // Reflection writing goal
      const reflectionGoalProgress = Math.min((reflectionCount / 5) * 100, 100);
      goals.push({
        id: 'reflection-practice',
        title: 'Write 5 Reflections',
        description: 'Develop self-awareness through regular reflection',
        category: 'Self-Development',
        priority: 'medium',
        status: reflectionCount >= 5 ? 'completed' : reflectionCount > 0 ? 'in_progress' : 'not_started',
        progress: reflectionGoalProgress,
        targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days from now
        createdDate: user.createdAt || new Date().toISOString(),
        milestones: [
          {
            id: 'first-reflection',
            title: 'Write first reflection',
            completed: reflectionCount >= 1,
            completedDate: reflections && reflections.length > 0 ? reflections[reflections.length - 1]?.created_at : undefined
          },
          {
            id: 'three-reflections',
            title: 'Write 3 reflections',
            completed: reflectionCount >= 3,
            completedDate: reflections && reflections.length >= 3 ? reflections[reflections.length - 3]?.created_at : undefined
          },
          {
            id: 'five-reflections',
            title: 'Write 5 reflections',
            completed: reflectionCount >= 5,
            completedDate: reflections && reflections.length >= 5 ? reflections[reflections.length - 5]?.created_at : undefined
          }
        ]
      });

      // Mood improvement goal (if user has mood ratings)
      const moodRatings = reflections?.filter((r: any) => r.mood_rating !== null).map((r: any) => r.mood_rating as number) || [];
      if (moodRatings.length > 0) {
        const averageMood = moodRatings.length > 0 ? moodRatings.reduce((sum: number, rating: number) => sum + rating, 0) / moodRatings.length : 0;
        const highMoodCount = moodRatings.filter(rating => (rating || 0) >= 8).length;
        const moodGoalProgress = Math.min((highMoodCount / 5) * 100, 100);

        goals.push({
          id: 'mood-improvement',
          title: 'Maintain Positive Mood',
          description: 'Record 5 high mood ratings (8+) to build emotional well-being',
          category: 'Wellness',
          priority: 'high',
          status: highMoodCount >= 5 ? 'completed' : averageMood >= 6 ? 'in_progress' : 'not_started',
          progress: moodGoalProgress,
          targetDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days from now
          createdDate: user.createdAt || new Date().toISOString(),
          milestones: [
            {
              id: 'first-high-mood',
              title: 'Record first high mood (8+)',
              completed: highMoodCount >= 1,
              completedDate: highMoodCount >= 1 ? reflections.find((r: any) => (r.mood_rating || 0) >= 8)?.created_at : undefined
            },
            {
              id: 'three-high-moods',
              title: 'Record 3 high moods',
              completed: highMoodCount >= 3,
              completedDate: highMoodCount >= 3 ? reflections.filter((r: any) => (r.mood_rating || 0) >= 8)[2]?.created_at : undefined
            },
            {
              id: 'five-high-moods',
              title: 'Record 5 high moods',
              completed: highMoodCount >= 5,
              completedDate: highMoodCount >= 5 ? reflections.filter((r: any) => (r.mood_rating || 0) >= 8)[4]?.created_at : undefined
            }
          ]
        });
      }

      // Future session scheduling goal
      if (upcomingSessions.length === 0 && completedSessions.length > 0) {
        goals.push({
          id: 'schedule-next-session',
          title: 'Schedule Next Session',
          description: 'Maintain momentum by scheduling your next coaching session',
          category: 'Sessions',
          priority: 'high',
          status: 'not_started',
          progress: 0,
          targetDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks from now
          createdDate: new Date().toISOString(),
          milestones: [
            {
              id: 'schedule-session',
              title: 'Schedule upcoming session',
              completed: false
            }
          ]
        });
      }

    } else if (user.role === 'coach') {
      // Coach-specific goals
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('id, client_id, status, scheduled_at')
        .eq('coach_id', user.id);

      if (sessionsError) throw sessionsError;

      const { data: notes, error: notesError } = await supabase
        .from('coach_notes')
        .select('id, created_at')
        .eq('coach_id', user.id);

      if (notesError) throw notesError;

      const completedSessions = sessions?.filter(s => s.status === 'completed') || [];
      const uniqueClients = new Set(sessions?.map(s => s.client_id) || []);
      const noteCount = notes?.length || 0;

      // Client base growth goal
      const clientGoalProgress = Math.min((uniqueClients.size / 10) * 100, 100);
      goals.push({
        id: 'client-growth',
        title: 'Coach 10 Different Clients',
        description: 'Build your coaching practice by working with diverse clients',
        category: 'Business',
        priority: 'high',
        status: uniqueClients.size >= 10 ? 'completed' : uniqueClients.size > 0 ? 'in_progress' : 'not_started',
        progress: clientGoalProgress,
        targetDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(), // 6 months
        createdDate: user.createdAt || new Date().toISOString(),
        milestones: [
          {
            id: 'first-client',
            title: 'Start coaching first client',
            completed: uniqueClients.size >= 1
          },
          {
            id: 'five-clients',
            title: 'Coach 5 different clients',
            completed: uniqueClients.size >= 5
          },
          {
            id: 'ten-clients',
            title: 'Coach 10 different clients',
            completed: uniqueClients.size >= 10
          }
        ]
      });

      // Session delivery goal
      const sessionGoalProgress = Math.min((completedSessions.length / 50) * 100, 100);
      goals.push({
        id: 'session-delivery',
        title: 'Complete 50 Coaching Sessions',
        description: 'Build expertise through consistent session delivery',
        category: 'Professional',
        priority: 'medium',
        status: completedSessions.length >= 50 ? 'completed' : completedSessions.length > 0 ? 'in_progress' : 'not_started',
        progress: sessionGoalProgress,
        targetDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString(), // 4 months
        createdDate: user.createdAt || new Date().toISOString(),
        milestones: [
          {
            id: 'ten-sessions',
            title: 'Complete 10 sessions',
            completed: completedSessions.length >= 10
          },
          {
            id: 'twenty-five-sessions',
            title: 'Complete 25 sessions',
            completed: completedSessions.length >= 25
          },
          {
            id: 'fifty-sessions',
            title: 'Complete 50 sessions',
            completed: completedSessions.length >= 50
          }
        ]
      });

      // Note-taking goal
      const noteGoalProgress = Math.min((noteCount / 20) * 100, 100);
      goals.push({
        id: 'documentation-practice',
        title: 'Write 20 Client Notes',
        description: 'Maintain detailed client records for better coaching outcomes',
        category: 'Professional',
        priority: 'medium',
        status: noteCount >= 20 ? 'completed' : noteCount > 0 ? 'in_progress' : 'not_started',
        progress: noteGoalProgress,
        targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 3 months
        createdDate: user.createdAt || new Date().toISOString(),
        milestones: [
          {
            id: 'five-notes',
            title: 'Write 5 client notes',
            completed: noteCount >= 5
          },
          {
            id: 'ten-notes',
            title: 'Write 10 client notes',
            completed: noteCount >= 10
          },
          {
            id: 'twenty-notes',
            title: 'Write 20 client notes',
            completed: noteCount >= 20
          }
        ]
      });
    }

    // Filter by status if provided
    let filteredGoals = goals;
    if (status) {
      filteredGoals = goals.filter(goal => goal.status === status);
    }

    // Apply limit
    const limitedGoals = filteredGoals.slice(0, limit);

    const response: ProgressResponse = {
      goals: limitedGoals,
      totalGoals: goals.length,
      completedGoals: goals.filter(g => g.status === 'completed').length,
      inProgressGoals: goals.filter(g => g.status === 'in_progress').length
    };

    return NextResponse.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch progress data' },
      { status: 500 }
    );
  }
}