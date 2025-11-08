'use client';

import { useQuery } from '@tanstack/react-query';
import { format, parseISO} from 'date-fns';
import { 
  Calendar, 
 
 
  CheckCircle,
  BookOpen,
  Heart,
  ArrowUpRight,
  MessageSquare,
  User,
  Settings,
  Target,
  BarChart3,
  Bell,
  FileText,
  Plus,
  Star,

  Zap,
  AlertCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useState, useMemo, Suspense, memo} from 'react';

import { LazyProgressChart} from '@/components/charts/lazy-chart';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser } from '@/lib/auth/use-user';
import { ClientTaskBoard } from '@/modules/tasks/components';
import type { Session, User} from '@/types';

// Types for API responses
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

interface RecentNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  createdAt: string;
  isRead: boolean;
}

interface CoachRecommendation {
  id: string;
  firstName: string;
  lastName: string;
  specializations: string[];
  rating: number;
  sessionsCompleted: number;
  avatarUrl?: string;
}

// Chart colors
const _CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

// Helper functions
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

// Loading skeleton component - memoized to prevent re-renders
const LoadingSkeleton = memo(() => (
  <div className="animate-pulse">
    <div className="h-8 bg-gray-200 rounded mb-4"></div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
));

LoadingSkeleton.displayName = 'LoadingSkeleton';

// Stats card component - memoized to prevent unnecessary re-renders
const StatsCard = memo(({ title, value, icon, change, trend }: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
}) => (
  <Card className="hover:shadow-md transition-shadow">
    <CardContent className="flex items-center p-6">
      <div className="flex-1">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="flex items-center space-x-2">
          <p className="text-2xl font-bold">{value}</p>
          {change && (
            <Badge variant={trend === 'up' ? 'default' : trend === 'down' ? 'destructive' : 'secondary'}>
              {change}
            </Badge>
          )}
        </div>
      </div>
      <div className="text-muted-foreground">
        {icon}
      </div>
    </CardContent>
  </Card>
));

StatsCard.displayName = 'StatsCard';

export function ClientDashboard() {
  const user = useUser();
  const router = useRouter();
  const locale = useLocale();
  const withLocale = (path: string) => (/^\/(en|he)\//.test(path) ? path : `/${locale}${path}`);
  
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch client stats
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
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
  const { data: upcomingSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['upcoming-sessions', user?.id],
    queryFn: async (): Promise<Session[]> => {
      const response = await fetch(`/api/sessions?clientId=${user?.id}&status=scheduled&limit=5&sortOrder=asc`);
      if (!response.ok) throw new Error('Failed to fetch sessions');
      const result = await response.json();
      return result.data;
    },
    enabled: !!user?.id,
  });

  // Fetch recent reflections
  const { data: recentReflections } = useQuery({
    queryKey: ['recent-reflections', user?.id],
    queryFn: async (): Promise<RecentReflection[]> => {
      const response = await fetch('/api/client/reflections?limit=3');
      if (!response.ok) throw new Error('Failed to fetch reflections');
      const result = await response.json();
      return result.data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch recent notifications
  const { data: recentNotifications } = useQuery({
    queryKey: ['recent-notifications', user?.id],
    queryFn: async (): Promise<RecentNotification[]> => {
      const response = await fetch('/api/notifications?limit=3&unreadOnly=false');
      if (!response.ok) throw new Error('Failed to fetch notifications');
      const result = await response.json();
      return result.data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch coach recommendations
  const { data: coachRecommendations } = useQuery({
    queryKey: ['coach-recommendations', user?.id],
    queryFn: async (): Promise<CoachRecommendation[]> => {
      const response = await fetch('/api/coaches?recommended=true&limit=3');
      if (!response.ok) throw new Error('Failed to fetch recommendations');
      const result = await response.json();
      return result.data || [];
    },
    enabled: !!user?.id,
  });

  // Handle loading and error states
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-96">
          <CardContent className="flex flex-col items-center p-6 text-center">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Authentication Required</h3>
            <p className="text-muted-foreground mb-4">
              Please sign in to access your dashboard.
            </p>
            <Button onClick={() => router.push(withLocale('/auth/signin'))}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (statsLoading) {
    return <LoadingSkeleton />;
  }

  if (statsError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-96">
          <CardContent className="flex flex-col items-center p-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="font-semibold mb-2">Unable to Load Dashboard</h3>
            <p className="text-muted-foreground mb-4">
              We're having trouble loading your dashboard. Please try again later.
            </p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progressChartData = useMemo(
    () => [
      {
        name: 'Completed',
        mood: stats?.averageMoodRating ?? 0,
        sessions: stats?.completedSessions ?? 0,
      },
      {
        name: 'Upcoming',
        mood: stats?.averageMoodRating ?? 0,
        sessions: stats?.upcomingSessions ?? 0,
      },
    ],
    [stats?.averageMoodRating, stats?.completedSessions, stats?.upcomingSessions]
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {user.firstName || 'there'}!
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your coaching journey.
          </p>
        </div>
        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          <Button 
            variant="outline" 
            onClick={() => router.push(withLocale('/client/book'))}
            className="flex items-center space-x-2"
          >
            <Calendar className="h-4 w-4" />
            <span>Book Session</span>
          </Button>
          <Button 
            onClick={() => router.push(withLocale('/messages'))}
            className="flex items-center space-x-2"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Messages</span>
          </Button>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="progress">Action Items</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Total Sessions"
              value={stats?.totalSessions || 0}
              icon={<Calendar className="h-8 w-8" />}
              change={stats?.thisWeekSessions ? `+${stats.thisWeekSessions} this week` : undefined}
              trend="up"
            />
            <StatsCard
              title="Completed Sessions"
              value={stats?.completedSessions || 0}
              icon={<CheckCircle className="h-8 w-8" />}
              change={stats?.completedSessions && stats?.totalSessions ? 
                `${Math.round((stats.completedSessions / stats.totalSessions) * 100)}% completion` : undefined}
              trend="up"
            />
            <StatsCard
              title="Current Streak"
              value={`${stats?.currentStreak || 0} days`}
              icon={<Zap className="h-8 w-8" />}
              change={stats?.currentStreak && stats.currentStreak > 0 ? "Active streak!" : undefined}
              trend={stats?.currentStreak && stats.currentStreak > 0 ? "up" : "neutral"}
            />
            <StatsCard
              title="Average Mood"
              value={stats?.averageMoodRating ? `${stats.averageMoodRating.toFixed(1)}/10` : 'N/A'}
              icon={<Heart className="h-8 w-8" />}
              change={stats?.averageMoodRating ? getMoodEmoji(stats.averageMoodRating) : undefined}
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Sessions */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5" />
                    <span>Upcoming Sessions</span>
                  </CardTitle>
                  <CardDescription>Your next coaching sessions</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(withLocale('/client/sessions'))}
                  className="text-muted-foreground hover:text-foreground"
                >
                  View all <ArrowUpRight className="h-4 w-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div className="animate-pulse h-32 bg-muted rounded"></div>}>
                  {sessionsLoading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-4 bg-gray-200 rounded mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                        </div>
                      ))}
                    </div>
                  ) : upcomingSessions?.length ? (
                    <div className="space-y-4">
                      {upcomingSessions.slice(0, 3).map((session) => (
                        <div
                          key={session.id}
                          className="flex items-start space-x-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => router.push(withLocale(`/client/sessions/${session.id}`))}
                        >
                          <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div className="flex-1 space-y-1">
                            <p className="font-medium">{session.title || 'Coaching Session'}</p>
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                              <span>{format(parseISO(session.scheduledAt), 'MMM d, yyyy')}</span>
                              <span>•</span>
                              <span>{format(parseISO(session.scheduledAt), 'h:mm a')}</span>
                              <span>•</span>
                              <span>{session.duration} min</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">No upcoming sessions</p>
                      <Button size="sm" onClick={() => router.push(withLocale('/client/book'))}>
                        <Plus className="h-4 w-4 mr-2" />
                        Book a Session
                      </Button>
                    </div>
                  )}
                </Suspense>
              </CardContent>
            </Card>

            {/* Recent Reflections */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Recent Reflections</span>
                </CardTitle>
                <CardDescription>Your latest thoughts and insights</CardDescription>
              </CardHeader>
              <CardContent>
                {recentReflections?.length ? (
                  <div className="space-y-4">
                    {recentReflections.map((reflection) => (
                      <div key={reflection.id} className="p-3 bg-muted/30 rounded-lg">
                        <p className="text-sm mb-2 line-clamp-2">{reflection.content}</p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{format(parseISO(reflection.createdAt), 'MMM d, yyyy')}</span>
                          {reflection.moodRating && (
                            <span className={getMoodColor(reflection.moodRating)}>
                              {getMoodEmoji(reflection.moodRating)} {reflection.moodRating}/10
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No reflections yet</p>
                    <Button size="sm" onClick={() => router.push(withLocale('/client/reflections'))}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Reflection
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Progress Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Progress Overview</span>
                </CardTitle>
                <CardDescription>Your coaching journey metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Goals Achieved</span>
                    <span className="font-semibold">{stats?.goalsAchieved || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Session Completion Rate</span>
                    <span className="font-semibold">
                      {stats?.totalSessions && stats?.completedSessions 
                        ? `${Math.round((stats.completedSessions / stats.totalSessions) * 100)}%`
                        : '0%'
                      }
                    </span>
                  </div>
                  <div className="pt-4">
                    <Suspense fallback={<div className="h-32 bg-muted rounded animate-pulse"></div>}>
                      <LazyProgressChart data={progressChartData} />
                    </Suspense>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Quick Actions</span>
                </CardTitle>
                <CardDescription>Common tasks and shortcuts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" size="sm" onClick={() => router.push(withLocale('/client/notes'))}>
                    <FileText className="h-4 w-4 mr-2" />
                    My Notes
                  </Button>
                    <Button variant="outline" size="sm" onClick={() => router.push(withLocale('/client/progress'))}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Progress
                  </Button>
                    <Button variant="outline" size="sm" onClick={() => router.push(withLocale('/client/coaches'))}>
                    <User className="h-4 w-4 mr-2" />
                    Find Coaches
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => router.push(withLocale('/settings'))}>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Session Management</CardTitle>
              <CardDescription>View and manage your coaching sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Session Management</h3>
                <p className="text-muted-foreground mb-6">
                  Detailed session management interface coming soon.
                </p>
                <Button onClick={() => router.push(withLocale('/client/sessions'))}>
                  View All Sessions
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress" className="space-y-6">
          <ClientTaskBoard />
        </TabsContent>

        <TabsContent value="resources" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recommended Coaches */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Star className="h-5 w-5" />
                  <span>Recommended Coaches</span>
                </CardTitle>
                <CardDescription>Coaches that might be a good fit for you</CardDescription>
              </CardHeader>
              <CardContent>
                {coachRecommendations?.length ? (
                  <div className="space-y-4">
                    {coachRecommendations.map((coach) => (
                      <div key={coach.id} className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                        <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{coach.firstName} {coach.lastName}</p>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <span>{coach.rating.toFixed(1)} ⭐</span>
                            <span>•</span>
                            <span>{coach.sessionsCompleted} sessions</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {coach.specializations.slice(0, 2).map((spec, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{spec}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No coach recommendations available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="h-5 w-5" />
                  <span>Recent Updates</span>
                </CardTitle>
                <CardDescription>Latest notifications and announcements</CardDescription>
              </CardHeader>
              <CardContent>
                {recentNotifications?.length ? (
                  <div className="space-y-4">
                    {recentNotifications.map((notification) => (
                      <div key={notification.id} className="flex items-start space-x-3 p-3 bg-muted/30 rounded-lg">
                        <Bell className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1 space-y-1">
                          <p className="font-medium text-sm">{notification.title}</p>
                          <p className="text-sm text-muted-foreground">{notification.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(notification.createdAt), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No recent notifications</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
