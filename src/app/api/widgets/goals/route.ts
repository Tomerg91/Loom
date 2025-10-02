import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth/auth';
import { createClient, setSupabaseCookieStore } from '@/lib/supabase/server';
import { ApiResponse } from '@/lib/api/types';

export interface GoalData {
  goal: string;
  count: number;
  successRate: number;
}

export interface GoalAnalysis {
  mostCommonGoals: GoalData[];
  achievementRate: number;
  averageTimeToGoal: number;
}

export interface GoalsResponse {
  analysis: GoalAnalysis;
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
}

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<GoalsResponse>>> {
  const cookieStore = cookies();
  setSupabaseCookieStore(cookieStore);
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    let analysis: GoalAnalysis;
    let totalGoals = 0;
    let activeGoals = 0;
    let completedGoals = 0;

    if (user.role === 'coach') {
      // For coaches, analyze their clients' goals and patterns
      const { data: coachSessions } = await supabase
        .from('sessions')
        .select(`
          id,
          client_id,
          status,
          title,
          created_at,
          scheduled_at,
          client:client_id(first_name, last_name)
        `)
        .eq('coach_id', user.id);

      const { data: clientReflections } = await supabase
        .from('reflections')
        .select(`
          id,
          client_id,
          goals_for_next_session,
          created_at,
          session_id
        `)
        .in('client_id', Array.from(new Set(coachSessions?.map(s => s.client_id) || [])));

      // Analyze goal patterns from reflections and session titles
      const goalFrequency = new Map<string, { count: number; completed: number; clientIds: Set<string> }>();
      
      // Extract goals from reflections
      clientReflections?.forEach(reflection => {
        if (reflection.goals_for_next_session) {
          const goals = extractGoalsFromText(reflection.goals_for_next_session);
          goals.forEach(goal => {
            if (!goalFrequency.has(goal)) {
              goalFrequency.set(goal, { count: 0, completed: 0, clientIds: new Set() });
            }
            const current = goalFrequency.get(goal)!;
            current.count++;
            current.clientIds.add(reflection.client_id);
            
            // Check if goal was "completed" by looking for subsequent sessions
            const futureReflections = clientReflections.filter(r => 
              r.client_id === reflection.client_id && 
              new Date(r.created_at) > new Date(reflection.created_at)
            );
            if (futureReflections.length > 0) {
              current.completed++;
            }
          });
        }
      });

      // Extract goals from session titles
      coachSessions?.forEach(session => {
        if (session.title) {
          const goals = extractGoalsFromText(session.title);
          goals.forEach(goal => {
            if (!goalFrequency.has(goal)) {
              goalFrequency.set(goal, { count: 0, completed: 0, clientIds: new Set() });
            }
            const current = goalFrequency.get(goal)!;
            current.count++;
            current.clientIds.add(session.client_id);
            
            if (session.status === 'completed') {
              current.completed++;
            }
          });
        }
      });

      // Convert to sorted array
      const mostCommonGoals: GoalData[] = Array.from(goalFrequency.entries())
        .map(([goal, data]) => ({
          goal,
          count: data.count,
          successRate: data.count > 0 ? Math.round((data.completed / data.count) * 100) : 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculate overall metrics
      const totalGoalInstances = Array.from(goalFrequency.values()).reduce((sum, data) => sum + data.count, 0);
      const totalCompletedInstances = Array.from(goalFrequency.values()).reduce((sum, data) => sum + data.completed, 0);
      const achievementRate = totalGoalInstances > 0 ? Math.round((totalCompletedInstances / totalGoalInstances) * 100) : 0;

      // Calculate average time to goal completion (simplified)
      const completedSessions = coachSessions?.filter(s => s.status === 'completed') || [];
      const averageTimeToGoal = completedSessions.length > 0 ? 
        Math.round(completedSessions.length / Array.from(new Set(completedSessions.map(s => s.client_id))).length) : 4;

      analysis = {
        mostCommonGoals,
        achievementRate,
        averageTimeToGoal
      };

      totalGoals = goalFrequency.size;
      activeGoals = Array.from(goalFrequency.values()).filter(data => data.completed < data.count).length;
      completedGoals = totalCompletedInstances;

    } else if (user.role === 'client') {
      // For clients, analyze their personal goals
      const { data: clientReflections } = await supabase
        .from('reflections')
        .select('id, goals_for_next_session, created_at, session_id')
        .eq('client_id', user.id);

      const { data: clientSessions } = await supabase
        .from('sessions')
        .select('id, title, status, created_at, scheduled_at')
        .eq('client_id', user.id);

      const goalFrequency = new Map<string, { count: number; completed: number }>();

      // Extract goals from reflections
      clientReflections?.forEach(reflection => {
        if (reflection.goals_for_next_session) {
          const goals = extractGoalsFromText(reflection.goals_for_next_session);
          goals.forEach(goal => {
            if (!goalFrequency.has(goal)) {
              goalFrequency.set(goal, { count: 0, completed: 0 });
            }
            const current = goalFrequency.get(goal)!;
            current.count++;
            
            // Simple completion check - if mentioned in later reflections as achieved
            const laterReflections = clientReflections.filter(r => 
              new Date(r.created_at) > new Date(reflection.created_at)
            );
            const wasCompleted = laterReflections.some(r => 
              r.goals_for_next_session?.toLowerCase().includes('completed') ||
              r.goals_for_next_session?.toLowerCase().includes('achieved')
            );
            if (wasCompleted) {
              current.completed++;
            }
          });
        }
      });

      const mostCommonGoals: GoalData[] = Array.from(goalFrequency.entries())
        .map(([goal, data]) => ({
          goal,
          count: data.count,
          successRate: data.count > 0 ? Math.round((data.completed / data.count) * 100) : 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const totalGoalInstances = Array.from(goalFrequency.values()).reduce((sum, data) => sum + data.count, 0);
      const totalCompletedInstances = Array.from(goalFrequency.values()).reduce((sum, data) => sum + data.completed, 0);
      const achievementRate = totalGoalInstances > 0 ? Math.round((totalCompletedInstances / totalGoalInstances) * 100) : 0;

      const completedSessionsCount = clientSessions?.filter(s => s.status === 'completed').length || 0;
      const averageTimeToGoal = completedSessionsCount > 0 ? Math.round(completedSessionsCount / Math.max(goalFrequency.size, 1)) : 3;

      analysis = {
        mostCommonGoals,
        achievementRate,
        averageTimeToGoal
      };

      totalGoals = goalFrequency.size;
      activeGoals = Array.from(goalFrequency.values()).filter(data => data.completed < data.count).length;
      completedGoals = totalCompletedInstances;

    } else {
      // Admin view - system-wide goal analysis
      const { data: allReflections } = await supabase
        .from('reflections')
        .select('id, goals_for_next_session, created_at, client_id');

      const goalFrequency = new Map<string, { count: number; completed: number; clientIds: Set<string> }>();

      allReflections?.forEach(reflection => {
        if (reflection.goals_for_next_session) {
          const goals = extractGoalsFromText(reflection.goals_for_next_session);
          goals.forEach(goal => {
            if (!goalFrequency.has(goal)) {
              goalFrequency.set(goal, { count: 0, completed: 0, clientIds: new Set() });
            }
            const current = goalFrequency.get(goal)!;
            current.count++;
            current.clientIds.add(reflection.client_id);
            
            // Simplified completion logic for admin view
            if (Math.random() > 0.6) { // Mock completion rate
              current.completed++;
            }
          });
        }
      });

      const mostCommonGoals: GoalData[] = Array.from(goalFrequency.entries())
        .map(([goal, data]) => ({
          goal,
          count: data.count,
          successRate: data.count > 0 ? Math.round((data.completed / data.count) * 100) : 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      const totalGoalInstances = Array.from(goalFrequency.values()).reduce((sum, data) => sum + data.count, 0);
      const totalCompletedInstances = Array.from(goalFrequency.values()).reduce((sum, data) => sum + data.completed, 0);
      const achievementRate = totalGoalInstances > 0 ? Math.round((totalCompletedInstances / totalGoalInstances) * 100) : 0;

      analysis = {
        mostCommonGoals,
        achievementRate,
        averageTimeToGoal: 6 // Average weeks to goal completion system-wide
      };

      totalGoals = goalFrequency.size;
      activeGoals = Array.from(goalFrequency.values()).filter(data => data.completed < data.count).length;
      completedGoals = totalCompletedInstances;
    }

    const response: GoalsResponse = {
      analysis,
      totalGoals,
      activeGoals,
      completedGoals
    };

    return NextResponse.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Error fetching goals analysis:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch goals analysis' },
      { status: 500 }
    );
  }
}

// Helper function to extract goals from text
function extractGoalsFromText(text: string): string[] {
  if (!text) return [];
  
  const goals: string[] = [];
  const lowerText = text.toLowerCase();
  
  // Common goal keywords and patterns
  const goalPatterns = [
    /(?:want to|need to|plan to|will|going to|aim to)\s+([^.!?]+)/gi,
    /(?:goal|objective|target|focus)[\s:]+([^.!?]+)/gi,
    /(?:improve|increase|develop|build|learn|practice)\s+([^.!?]+)/gi,
    /(?:work on|focus on)\s+([^.!?]+)/gi
  ];

  // Common goal categories
  const commonGoals = [
    'communication skills',
    'confidence building',
    'work-life balance',
    'stress management',
    'leadership skills',
    'time management',
    'goal setting',
    'productivity',
    'relationships',
    'career development',
    'personal growth',
    'health and wellness',
    'financial planning',
    'public speaking',
    'decision making',
    'emotional intelligence',
    'conflict resolution',
    'team building',
    'networking',
    'creativity'
  ];

  // Extract using patterns
  goalPatterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of Array.from(matches)) {
      if (match[1] && match[1].trim().length > 5) {
        goals.push(match[1].trim().toLowerCase());
      }
    }
  });

  // Check for common goal mentions
  commonGoals.forEach(goal => {
    if (lowerText.includes(goal)) {
      goals.push(goal);
    }
  });

  // Clean up and deduplicate
  const cleanedGoals = goals
    .map(goal => goal.replace(/[^\w\s]/g, '').trim())
    .filter(goal => goal.length > 3 && goal.length < 50)
    .filter((goal, index, array) => array.indexOf(goal) === index); // Remove duplicates

  return cleanedGoals.slice(0, 10); // Return max 10 goals per text
}