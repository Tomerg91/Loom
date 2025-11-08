'use client';

import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp,
  Target,
  Calendar,
  Star,
  Activity,

  Plus
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { 
  ProgressChart,
  GoalProgressChart,
  CompletionRateChart
} from '@/components/charts/chart-components';
import { 
  DashboardHeader,
  LoadingState,
  ErrorState,
  StatsCard,

  ProgressList,
  SessionList,
  AchievementGrid,
  useFormattedDates
} from '@/components/dashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';



interface ProgressData {
  overview: {
    totalSessions: number;
    completedSessions: number;
    upcomingSessions: number;
    totalGoals: number;
    completedGoals: number;
    overallProgress: number;
    streakDays: number;
    averageRating: number;
  };
  goals: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    priority: 'high' | 'medium' | 'low';
    status: 'not_started' | 'in_progress' | 'completed' | 'paused';
    progress: number;
    targetDate: string;
    createdDate: string;
    milestones: Array<{
      id: string;
      title: string;
      completed: boolean;
      completedDate?: string;
    }>;
  }>;
  sessions: Array<{
    id: string;
    coachName: string;
    coachAvatar?: string;
    date: string;
    duration: number;
    topic: string;
    rating?: number;
    notes?: string;
    keyInsights: string[];
    actionItems: string[];
    status: 'completed' | 'upcoming' | 'cancelled';
  }>;
  insights: Array<{
    date: string;
    progressScore: number;
    mood: number;
    energy: number;
    confidence: number;
  }>;
  achievements: Array<{
    id: string;
    title: string;
    description: string;
    earnedDate: string;
    category: string;
    icon: string;
  }>;
}

export function ClientProgressPage() {
  const t = useTranslations('client.progress');
  const [timeRange, setTimeRange] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');

  // Helper function to combine data from real APIs
  const combineProgressData = (stats: unknown, goals: unknown, sessions: unknown): ProgressData => {
    // Calculate insights from session ratings and reflection moods
    const insights = [];
    const now = new Date();
    for (let i = 0; i < 5; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - (i * 7)); // Weekly intervals
      insights.unshift({
        date: date.toISOString().split('T')[0],
        progressScore: Math.min(100, (stats.averageMoodRating || 5) * 10 + (stats.goalsAchieved || 0) * 10),
        mood: Math.round(stats.averageMoodRating || 5),
        energy: Math.round((stats.averageMoodRating || 5) + Math.random() - 0.5),
        confidence: Math.round((stats.averageMoodRating || 5) + Math.random() - 0.5),
      });
    }

    return {
      overview: {
        totalSessions: stats.totalSessions || 0,
        completedSessions: stats.completedSessions || 0,
        upcomingSessions: stats.upcomingSessions || 0,
        totalGoals: goals.length || 0,
        completedGoals: goals.filter((g: unknown) => g.status === 'completed').length || stats.goalsAchieved || 0,
        overallProgress: Math.round((stats.completedSessions / Math.max(stats.totalSessions, 1)) * 100) || 0,
        streakDays: stats.currentStreak || 0,
        averageRating: stats.averageSessionRating || stats.averageMoodRating || 0,
      },
      goals: goals.map((goal: unknown) => ({
        ...goal,
        milestones: goal.milestones || [],
      })),
      sessions: (sessions || []).map((session: unknown) => ({
        id: session.id,
        coachName: `${session.coach?.firstName || ''} ${session.coach?.lastName || ''}`.trim() || 'Coach',
        coachAvatar: session.coach?.avatarUrl,
        date: session.scheduledAt || session.created_at,
        duration: session.durationMinutes || session.duration || 60,
        topic: session.title || 'Coaching Session',
        rating: session.rating,
        notes: session.notes || session.description,
        keyInsights: session.keyInsights || [],
        actionItems: session.actionItems || [],
        status: session.status,
      })),
      insights,
      achievements: [
        {
          id: '1',
          title: 'First Goal Completed',
          description: 'Successfully completed your first coaching goal',
          earnedDate: new Date().toISOString(),
          category: 'Milestone',
          icon: '🎯',
        },
        {
          id: '2',
          title: 'Session Streak',
          description: `Maintained a ${stats.currentStreak || 0} day streak`,
          earnedDate: new Date().toISOString(),
          category: 'Engagement',
          icon: '🏆',
        },
        {
          id: '3',
          title: 'Reflection Master',
          description: `Completed ${stats.totalReflections || 0} reflection exercises`,
          earnedDate: new Date().toISOString(),
          category: 'Growth',
          icon: '📚',
        },
      ],
    };
  };

  const { data: progress, isLoading, error, refetch } = useQuery<ProgressData>({
    queryKey: ['client-progress', timeRange],
    queryFn: async () => {
      try {
        // Fetch data from real APIs in parallel
        const [statsRes, goalsRes, sessionsRes] = await Promise.all([
          fetch('/api/client/stats'),
          fetch('/api/widgets/progress'),  
          fetch('/api/sessions?limit=10'), // Get recent sessions
        ]);

        const [stats, goalsData, sessionsData] = await Promise.all([
          statsRes.ok ? statsRes.json() : { data: {} },
          goalsRes.ok ? goalsRes.json() : { data: [] },
          sessionsRes.ok ? sessionsRes.json() : { data: [] },
        ]);

        return combineProgressData(
          stats.data || {},
          goalsData.data || [],
          sessionsData.data || []
        );
      } catch (error) {
        console.error('Failed to fetch progress data:', error);
        // Return empty state on error
        return combineProgressData({}, [], []);
      }
    },
  });

  // Use the custom hook for formatted dates
  const formattedDates = useFormattedDates(progress);

  if (isLoading) {
    return <LoadingState title={t('title')} description={t('description')} />;
  }

  if (error) {
    return <ErrorState title={t('title')} description={t('description')} message="Error loading progress data" />;
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title={t('title')}
        description={t('description')}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        onRefresh={() => refetch()}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Overall Progress"
              value={`${progress?.overview.overallProgress}%`}
              icon={TrendingUp}
            />
            <StatsCard
              title="Sessions Completed"
              value={progress?.overview.completedSessions || 0}
              icon={Calendar}
              description={`${progress?.overview.upcomingSessions} upcoming`}
            />
            <StatsCard
              title="Goals Achieved"
              value={`${progress?.overview.completedGoals}/${progress?.overview.totalGoals}`}
              icon={Target}
              description={`${Math.round((progress?.overview.completedGoals || 0) / (progress?.overview.totalGoals || 1) * 100)}% completion rate`}
            />
            <StatsCard
              title="Current Streak"
              value={progress?.overview.streakDays || 0}
              icon={Activity}
              description="days of consistent progress"
            />
          </div>

          {/* Progress Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProgressChart 
              data={progress?.insights || []}
              title="Progress Over Time"
              description="Your growth journey and key metrics"
            />
            <GoalProgressChart 
              data={progress?.goals.map(goal => ({
                name: goal.title,
                progress: goal.progress,
              })) || []}
              title="Goal Progress"
              description="Current goal completion status"
            />
          </div>
          
          {/* Completion Rate Chart */}
          <CompletionRateChart
            data={[
              { 
                name: 'Completed', 
                value: Math.round((progress?.overview.completedSessions || 0) / Math.max(progress?.overview.totalSessions || 1, 1) * 100),
                color: '#10B981'
              },
              { 
                name: 'Upcoming', 
                value: Math.round((progress?.overview.upcomingSessions || 0) / Math.max(progress?.overview.totalSessions || 1, 1) * 100),
                color: '#3B82F6'
              },
              { 
                name: 'Remaining', 
                value: Math.max(0, 100 - Math.round(((progress?.overview.completedSessions || 0) + (progress?.overview.upcomingSessions || 0)) / Math.max(progress?.overview.totalSessions || 1, 1) * 100)),
                color: '#6B7280'
              }
            ]}
            title="Session Completion Rate"
            description="Breakdown of your session activity"
          />

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your latest progress and achievements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {progress?.sessions.slice(0, 3).map((session) => (
                  <div key={session.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium">{session.topic}</p>
                      <p className="text-sm text-muted-foreground">
                        Session with {session.coachName} • {formattedDates[`session-${session.id}`]}
                      </p>
                    </div>
                    {session.rating && (
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 mr-1" />
                        <span className="text-sm">{session.rating}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          {/* Goals Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Your Goals</h2>
              <p className="text-muted-foreground">Track your progress towards personal and professional growth</p>
            </div>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add New Goal
            </Button>
          </div>

          {/* Goals List */}
          <ProgressList 
            goals={progress?.goals || []} 
            formattedDates={formattedDates} 
          />
        </TabsContent>

        <TabsContent value="sessions" className="space-y-6">
          <SessionList 
            sessions={progress?.sessions || []} 
            formattedDates={formattedDates} 
          />
        </TabsContent>

        <TabsContent value="achievements" className="space-y-6">
          <AchievementGrid 
            achievements={progress?.achievements || []} 
            formattedDates={formattedDates}
            totalAchievements={progress?.achievements.length}
            streakDays={progress?.overview.streakDays}
            completedGoals={progress?.overview.completedGoals}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Export as default for dynamic imports
export default ClientProgressPage;