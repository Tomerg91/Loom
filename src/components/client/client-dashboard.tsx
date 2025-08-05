'use client';

import { useState, useMemo, useCallback } from 'react';
import { useUser } from '@/lib/store/auth-store';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  Clock, 
  
  TrendingUp, 
  CheckCircle,
  BookOpen,
  Heart,
  ArrowUpRight
} from 'lucide-react';
import { SessionList } from '@/components/sessions/session-list';
import { SessionCalendar } from '@/components/sessions/session-calendar';
import { ReflectionsManagement } from '@/components/client/reflections-management';
import { format, parseISO, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import type { Session } from '@/types';

// Helper functions moved outside component to prevent re-creation
const getMoodColor = (rating: number) => {
  if (rating >= 8) return 'text-green-600';
  if (rating >= 6) return 'text-yellow-600';
  if (rating >= 4) return 'text-orange-600';
  return 'text-red-600';
};

const getMoodEmoji = (rating: number) => {
  if (rating >= 8) return '😊';
  if (rating >= 6) return '😐';
  if (rating >= 4) return '😕';
  return '😔';
};

interface ClientStats {
  totalSessions: number;
  completedSessions: number;
  upcomingSessions: number;
  totalReflections: number;
  thisWeekSessions: number;
  averageMoodRating: number;
  goalsAchieved: number;
  currentStreak: number;
}

interface RecentReflection {
  id: string;
  sessionId?: string;
  content: string;
  moodRating?: number;
  createdAt: string;
  sessionTitle?: string;
}

export function ClientDashboard() {
  const user = useUser();
  
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch client stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['client-stats', user?.id],
    queryFn: async (): Promise<ClientStats> => {
      const response = await fetch('/api/client/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch client statistics');
      }
      const result = await response.json();
      return result.data;
    },
    enabled: !!user?.id,
  });

  // Fetch upcoming sessions
  const { data: upcomingSessions } = useQuery({
    queryKey: ['upcoming-sessions', user?.id],
    queryFn: async (): Promise<Session[]> => {
      const response = await fetch(`/api/sessions?clientId=${user?.id}&status=scheduled&limit=5&sortOrder=asc`);
      if (!response.ok) throw new Error('Failed to fetch sessions');
      const data = await response.json();
      return data.data;
    },
    enabled: !!user?.id,
  });

  // Fetch recent reflections
  const { data: recentReflections } = useQuery({
    queryKey: ['recent-reflections', user?.id],
    queryFn: async (): Promise<RecentReflection[]> => {
      const response = await fetch('/api/client/reflections?limit=5');
      if (!response.ok) {
        throw new Error('Failed to fetch recent reflections');
      }
      const result = await response.json();
      return result.data;
    },
    enabled: !!user?.id,
  });

  // Memoize expensive calculations
  const thisWeekSessions = useMemo(() => {
    if (!upcomingSessions) return [];
    
    const thisWeekStart = startOfWeek(new Date());
    const thisWeekEnd = endOfWeek(new Date());
    
    return upcomingSessions.filter(session =>
      isWithinInterval(parseISO(session.scheduledAt), { start: thisWeekStart, end: thisWeekEnd })
    );
  }, [upcomingSessions]);

  return (
    <div className="space-y-6">
      {/* Accessibility: Screen reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {statsLoading ? 'Loading dashboard statistics...' : 'Dashboard loaded successfully'}
      </div>
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">My Coaching Journey</h1>
        <p className="text-muted-foreground">
          Track your progress and continue growing, {user?.firstName}!
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md" role="tablist" aria-label="Dashboard navigation">
          <TabsTrigger value="overview" aria-label="Overview dashboard">Overview</TabsTrigger>
          <TabsTrigger value="sessions" aria-label="Sessions management">Sessions</TabsTrigger>
          <TabsTrigger value="reflections" aria-label="Reflections journal">Reflections</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Upcoming Sessions
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? '...' : stats?.upcomingSessions || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {thisWeekSessions.length} this week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Sessions Completed
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? '...' : stats?.completedSessions || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  of {stats?.totalSessions || 0} total sessions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Reflections Written
                </CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? '...' : stats?.totalReflections || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  insights captured
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Average Mood
                </CardTitle>
                <Heart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? '...' : stats?.averageMoodRating || 0}/10
                </div>
                <p className="text-xs text-muted-foreground">
                  recent feeling
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Sessions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Next Sessions
                </CardTitle>
                <CardDescription>
                  Your upcoming coaching sessions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!upcomingSessions || upcomingSessions.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No upcoming sessions</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingSessions.slice(0, 3).map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                        onClick={() => window.location.href = `/sessions/${session.id}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            window.location.href = `/sessions/${session.id}`;
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        aria-label={`View session: ${session.title} with ${session.coach.firstName} ${session.coach.lastName}`}
                      >
                        <div>
                          <h4 className="font-medium">{session.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            with {session.coach.firstName} {session.coach.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(session.scheduledAt), 'PPp')}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {session.duration}m
                        </Badge>
                      </div>
                    ))}
                    {upcomingSessions.length > 3 && (
                      <Button 
                        variant="ghost" 
                        className="w-full"
                        onClick={() => setActiveTab('sessions')}
                      >
                        View all sessions
                        <ArrowUpRight className="h-4 w-4 ml-2" />
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Reflections */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Recent Reflections
                </CardTitle>
                <CardDescription>
                  Your latest insights and thoughts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!recentReflections || recentReflections.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No reflections yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentReflections.slice(0, 3).map((reflection) => (
                      <div
                        key={reflection.id}
                        className="space-y-2 p-3 border rounded-lg"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {reflection.sessionTitle && (
                              <Badge variant="outline" className="text-xs">
                                {reflection.sessionTitle}
                              </Badge>
                            )}
                            {reflection.moodRating && (
                              <span className={`text-sm ${getMoodColor(reflection.moodRating)}`}>
                                {getMoodEmoji(reflection.moodRating)} {reflection.moodRating}/10
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(parseISO(reflection.createdAt), 'PP')}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {reflection.content}
                        </p>
                      </div>
                    ))}
                    <Button 
                      variant="ghost" 
                      className="w-full"
                      onClick={() => setActiveTab('reflections')}
                    >
                      View all reflections
                      <ArrowUpRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Progress Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Your Progress
              </CardTitle>
              <CardDescription>
                Overview of your coaching journey milestones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {stats?.goalsAchieved || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Goals Achieved</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {stats?.currentStreak || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Week Streak</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {Math.round(((stats?.completedSessions || 0) / (stats?.totalSessions || 1)) * 100)}%
                  </div>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-6">
          <Tabs defaultValue="list">
            <TabsList>
              <TabsTrigger value="list">List View</TabsTrigger>
              <TabsTrigger value="calendar">Calendar View</TabsTrigger>
            </TabsList>
            
            <TabsContent value="list">
              <SessionList 
                showFilters={true}
                clientId={user?.id}
                limit={20}
              />
            </TabsContent>
            
            <TabsContent value="calendar">
              <SessionCalendar
                clientId={user?.id}
                onSessionClick={(session) => {
                  // Navigate to session details
                  window.location.href = `/sessions/${session.id}`;
                }}
              />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="reflections" className="space-y-6">
          <ReflectionsManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}