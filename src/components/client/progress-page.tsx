'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { 
  TrendingUp,
  Target,
  Calendar,
  Star,
  Activity,
  BarChart3,
  Plus
} from 'lucide-react';
import { 
  DashboardHeader,
  LoadingState,
  ErrorState,
  StatsCard,
  ChartPlaceholder,
  ProgressList,
  SessionList,
  AchievementGrid,
  useFormattedDates
} from '@/components/dashboard';

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

  const { data: progress, isLoading, error, refetch } = useQuery<ProgressData>({
    queryKey: ['client-progress', timeRange],
    queryFn: async () => {
      // Mock API call
      return {
        overview: {
          totalSessions: 15,
          completedSessions: 12,
          upcomingSessions: 3,
          totalGoals: 5,
          completedGoals: 2,
          overallProgress: 68,
          streakDays: 14,
          averageRating: 4.7,
        },
        goals: [
          {
            id: '1',
            title: 'Improve Leadership Skills',
            description: 'Develop confident leadership presence and effective team management abilities',
            category: 'Professional Development',
            priority: 'high',
            status: 'in_progress',
            progress: 75,
            targetDate: '2024-03-15',
            createdDate: '2024-01-10',
            milestones: [
              { id: '1', title: 'Complete leadership assessment', completed: true, completedDate: '2024-01-15' },
              { id: '2', title: 'Practice active listening', completed: true, completedDate: '2024-01-25' },
              { id: '3', title: 'Lead team meeting', completed: false },
              { id: '4', title: 'Get 360 feedback', completed: false },
            ],
          },
          {
            id: '2',
            title: 'Work-Life Balance',
            description: 'Establish healthy boundaries and manage stress effectively',
            category: 'Personal Well-being',
            priority: 'high',
            status: 'in_progress',
            progress: 60,
            targetDate: '2024-02-28',
            createdDate: '2024-01-15',
            milestones: [
              { id: '1', title: 'Set daily boundaries', completed: true, completedDate: '2024-01-20' },
              { id: '2', title: 'Implement meditation routine', completed: false },
              { id: '3', title: 'Reduce overtime hours', completed: false },
            ],
          },
          {
            id: '3',
            title: 'Public Speaking Confidence',
            description: 'Overcome fear of public speaking and deliver presentations confidently',
            category: 'Communication',
            priority: 'medium',
            status: 'completed',
            progress: 100,
            targetDate: '2024-01-30',
            createdDate: '2024-01-05',
            milestones: [
              { id: '1', title: 'Join Toastmasters', completed: true, completedDate: '2024-01-10' },
              { id: '2', title: 'Give first speech', completed: true, completedDate: '2024-01-20' },
              { id: '3', title: 'Present at team meeting', completed: true, completedDate: '2024-01-28' },
            ],
          },
        ],
        sessions: [
          {
            id: '1',
            coachName: 'Sarah Johnson',
            date: '2024-01-18T14:00:00Z',
            duration: 60,
            topic: 'Leadership Development',
            rating: 5,
            notes: 'Great session on active listening techniques',
            keyInsights: ['Active listening builds trust', 'Ask open-ended questions', 'Paraphrase to confirm understanding'],
            actionItems: ['Practice active listening in next team meeting', 'Complete 360 feedback survey'],
            status: 'completed',
          },
          {
            id: '2',
            coachName: 'Sarah Johnson',
            date: '2024-01-15T14:00:00Z',
            duration: 60,
            topic: 'Goal Setting &amp; Planning',
            rating: 4,
            notes: 'Established clear goals and milestones',
            keyInsights: ['SMART goals are more achievable', 'Break down large goals into smaller steps'],
            actionItems: ['Define leadership goal milestones', 'Create weekly check-in routine'],
            status: 'completed',
          },
          {
            id: '3',
            coachName: 'Sarah Johnson',
            date: '2024-01-22T14:00:00Z',
            duration: 60,
            topic: 'Stress Management',
            status: 'upcoming',
            keyInsights: [],
            actionItems: [],
          },
        ],
        insights: [
          { date: '2024-01-01', progressScore: 45, mood: 6, energy: 7, confidence: 5 },
          { date: '2024-01-05', progressScore: 52, mood: 7, energy: 7, confidence: 6 },
          { date: '2024-01-10', progressScore: 58, mood: 7, energy: 8, confidence: 6 },
          { date: '2024-01-15', progressScore: 65, mood: 8, energy: 8, confidence: 7 },
          { date: '2024-01-20', progressScore: 68, mood: 8, energy: 7, confidence: 8 },
        ],
        achievements: [
          {
            id: '1',
            title: 'First Goal Completed',
            description: 'Successfully completed your first coaching goal',
            earnedDate: '2024-01-30',
            category: 'Milestone',
            icon: '🎯',
          },
          {
            id: '2',
            title: 'Consistency Champion',
            description: 'Attended 10 coaching sessions',
            earnedDate: '2024-01-25',
            category: 'Engagement',
            icon: '🏆',
          },
          {
            id: '3',
            title: 'Reflection Master',
            description: 'Completed 5 reflection exercises',
            earnedDate: '2024-01-20',
            category: 'Growth',
            icon: '📚',
          },
        ],
      };
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

          {/* Progress Chart */}
          <ChartPlaceholder
            title="Progress Over Time"
            description="Your growth journey and key metrics"
            icon={BarChart3}
            submessage="Progress, mood, energy, and confidence trends"
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