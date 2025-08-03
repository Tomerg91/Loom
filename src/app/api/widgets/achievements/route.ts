import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth/auth';
import { createClient } from '@/lib/supabase/server';
import { ApiResponse } from '@/lib/api/types';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  earnedDate: string;
  category: string;
  icon: string;
}

export interface AchievementStats {
  totalAchievements: number;
  streakDays: number;
  completedGoals: number;
}

export interface AchievementsResponse {
  achievements: Achievement[];
  stats: AchievementStats;
}

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<AchievementsResponse>>> {
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

    // Calculate achievements based on user activities
    const achievements: Achievement[] = [];
    let totalAchievements = 0;
    let streakDays = 0;
    let completedGoals = 0;

    if (user.role === 'client') {
      // Get client's sessions for achievement calculation
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('id, scheduled_at, status, created_at')
        .eq('client_id', user.id)
        .eq('status', 'completed')
        .order('scheduled_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Get client's reflections
      const { data: reflections, error: reflectionsError } = await supabase
        .from('reflections')
        .select('id, created_at, mood_rating')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });

      if (reflectionsError) throw reflectionsError;

      // Calculate achievements based on completed sessions
      const sessionCount = sessions?.length || 0;
      if (sessionCount >= 1) {
        achievements.push({
          id: 'first-session',
          title: 'First Steps',
          description: 'Completed your first coaching session',
          earnedDate: sessions[sessionCount - 1]?.scheduled_at || new Date().toISOString(),
          category: 'Sessions',
          icon: '🎯'
        });
      }

      if (sessionCount >= 5) {
        achievements.push({
          id: 'five-sessions',
          title: 'Consistent Learner',
          description: 'Completed 5 coaching sessions',
          earnedDate: sessions[sessionCount - 5]?.scheduled_at || new Date().toISOString(),
          category: 'Sessions',
          icon: '📚'
        });
      }

      if (sessionCount >= 10) {
        achievements.push({
          id: 'ten-sessions',
          title: 'Dedicated Student',
          description: 'Completed 10 coaching sessions',
          earnedDate: sessions[sessionCount - 10]?.scheduled_at || new Date().toISOString(),
          category: 'Sessions',
          icon: '🏆'
        });
      }

      // Reflection-based achievements
      const reflectionCount = reflections?.length || 0;
      if (reflectionCount >= 1) {
        achievements.push({
          id: 'first-reflection',
          title: 'Self-Reflector',
          description: 'Wrote your first reflection',
          earnedDate: reflections[reflectionCount - 1]?.created_at || new Date().toISOString(),
          category: 'Reflections',
          icon: '🔍'
        });
      }

      if (reflectionCount >= 10) {
        achievements.push({
          id: 'reflection-master',
          title: 'Reflection Master',
          description: 'Wrote 10 reflections',
          earnedDate: reflections[reflectionCount - 10]?.created_at || new Date().toISOString(),
          category: 'Reflections',
          icon: '📝'
        });
      }

      // High mood rating achievement
      const highMoodReflections = reflections?.filter(r => (r.mood_rating || 0) >= 8) || [];
      if (highMoodReflections.length >= 5) {
        achievements.push({
          id: 'positive-mindset',
          title: 'Positive Mindset',
          description: 'Recorded 5 high mood ratings (8+)',
          earnedDate: highMoodReflections[4]?.created_at || new Date().toISOString(),
          category: 'Wellness',
          icon: '😊'
        });
      }

      // Calculate streak (simplified - consecutive weeks with at least one session)
      if (sessions && sessions.length > 0) {
        let currentStreak = 0;
        const weeksSeen = new Set<string>();
        
        for (const session of sessions) {
          const sessionDate = new Date(session.scheduled_at);
          const weekKey = `${sessionDate.getFullYear()}-${Math.floor(sessionDate.getTime() / (7 * 24 * 60 * 60 * 1000))}`;
          weeksSeen.add(weekKey);
        }
        
        streakDays = weeksSeen.size * 7; // Approximate streak in days
      }

      totalAchievements = achievements.length;
      completedGoals = Math.floor(sessionCount / 3); // Simplified goal calculation

    } else if (user.role === 'coach') {
      // Get coach's completed sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('id, scheduled_at, status, client_id')
        .eq('coach_id', user.id)
        .eq('status', 'completed')
        .order('scheduled_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Get unique clients
      const uniqueClients = new Set(sessions?.map(s => s.client_id) || []);
      const sessionCount = sessions?.length || 0;
      const clientCount = uniqueClients.size;

      if (sessionCount >= 1) {
        achievements.push({
          id: 'first-coaching-session',
          title: 'First Client Session',
          description: 'Completed your first coaching session',
          earnedDate: sessions[sessionCount - 1]?.scheduled_at || new Date().toISOString(),
          category: 'Coaching',
          icon: '🎯'
        });
      }

      if (clientCount >= 1) {
        achievements.push({
          id: 'first-client',
          title: 'First Client',
          description: 'Started coaching your first client',
          earnedDate: sessions?.find(s => s.client_id === Array.from(uniqueClients)[0])?.scheduled_at || new Date().toISOString(),
          category: 'Coaching',
          icon: '👥'
        });
      }

      if (sessionCount >= 25) {
        achievements.push({
          id: 'seasoned-coach',
          title: 'Seasoned Coach',
          description: 'Completed 25 coaching sessions',
          earnedDate: sessions[sessionCount - 25]?.scheduled_at || new Date().toISOString(),
          category: 'Coaching',
          icon: '🏆'
        });
      }

      if (clientCount >= 5) {
        achievements.push({
          id: 'client-builder',
          title: 'Client Builder',
          description: 'Coaching 5 different clients',
          earnedDate: new Date().toISOString(),
          category: 'Coaching',
          icon: '🌟'
        });
      }

      totalAchievements = achievements.length;
      streakDays = Math.min(sessionCount * 2, 100); // Simplified streak calculation
      completedGoals = clientCount * 2; // Simplified goal calculation
    }

    // Sort achievements by date (most recent first) and limit
    const sortedAchievements = achievements
      .sort((a, b) => new Date(b.earnedDate).getTime() - new Date(a.earnedDate).getTime())
      .slice(0, limit);

    const response: AchievementsResponse = {
      achievements: sortedAchievements,
      stats: {
        totalAchievements,
        streakDays,
        completedGoals
      }
    };

    return NextResponse.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Error fetching achievements:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch achievements' },
      { status: 500 }
    );
  }
}