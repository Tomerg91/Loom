'use client';

import { useState, useMemo, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
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
  Activity,
  Zap
} from 'lucide-react';
import { format, parseISO, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { Session, User as UserType } from '@/types';

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
const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

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

// Loading skeleton component
const LoadingSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-8 bg-gray-200 rounded mb-4"></div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-32 bg-gray-200 rounded"></div>
      ))}
    </div>
  </div>
);

export default function ClientDashboardPage() {
  const user = useUser();
  const router = useRouter();
  
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
      const data = await response.json();
      return data.data;
    },
    enabled: !!user?.id,
  });

  // Fetch recent reflections
  const { data: recentReflections } = useQuery({
    queryKey: ['recent-reflections', user?.id],
    queryFn: async (): Promise<RecentReflection[]> => {
      const response = await fetch('/api/client/reflections?limit=3');
      if (!response.ok) {
        throw new Error('Failed to fetch recent reflections');
      }
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
      if (!response.ok) {
        throw new Error('Failed to fetch recent notifications');
      }
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
      if (!response.ok) {
        throw new Error('Failed to fetch coach recommendations');
      }
      const result = await response.json();
      return result.data || [];
    },
    enabled: !!user?.id,
  });

  // Mock progress data for charts
  const progressData = useMemo(() => {
    if (!stats) return [];
    
    return [
      { name: 'Week 1', mood: 6, sessions: 1 },
      { name: 'Week 2', mood: 7, sessions: 2 },
      { name: 'Week 3', mood: stats.averageMoodRating || 8, sessions: stats.thisWeekSessions },
      { name: 'Week 4', mood: stats.averageMoodRating + 0.5 || 8.5, sessions: stats.thisWeekSessions + 1 },
    ];
  }, [stats]);

  // Goal completion data
  const goalData = useMemo(() => {
    if (!stats) return [];
    
    const completed = stats.goalsAchieved;
    const total = completed + Math.max(3 - completed, 0);
    
    return [
      { name: 'Completed', value: completed, color: '#10B981' },
      { name: 'Remaining', value: total - completed, color: '#E5E7EB' },
    ];
  }, [stats]);

  // Memoize expensive calculations
  const thisWeekSessions = useMemo(() => {
    if (!upcomingSessions) return [];
    
    const thisWeekStart = startOfWeek(new Date());
    const thisWeekEnd = endOfWeek(new Date());
    
    return upcomingSessions.filter(session =>
      isWithinInterval(parseISO(session.scheduledAt), { start: thisWeekStart, end: thisWeekEnd })
    );
  }, [upcomingSessions]);

  // Navigation handlers
  const handleSessionClick = useCallback((sessionId: string) => {
    router.push(`/sessions/${sessionId}`);
  }, [router]);

  const handleQuickAction = useCallback((action: string) => {
    switch (action) {
      case 'book':
        router.push('/client/book');
        break;
      case 'message':
        router.push('/messages');
        break;
      case 'notes':
        router.push('/client/notes');
        break;
      case 'profile':
        router.push('/settings');
        break;
      default:
        break;
    }
  }, [router]);

  if (statsError) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="text-red-500 mb-4">
            <Activity className="h-12 w-12 mx-auto mb-4" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load dashboard</h3>
          <p className="text-gray-500 mb-4">There was an error loading your dashboard data.</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Accessibility: Screen reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {statsLoading ? 'Loading dashboard statistics...' : 'Dashboard loaded successfully'}
      </div>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.firstName || 'there'}!
          </h1>
          <p className="text-gray-600 mt-1">
            Here's your coaching journey progress and upcoming activities
          </p>
        </div>
        
        {/* Quick Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={() => handleQuickAction('book')}
            className="flex items-center gap-2"
            variant="default"
          >
            <Plus className="h-4 w-4" />
            Book Session
          </Button>
          <Button 
            onClick={() => handleQuickAction('message')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            Message Coach
          </Button>
        </div>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 max-w-md" role="tablist">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-700">
                    Upcoming Sessions
                  </CardTitle>
                  <Clock className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {statsLoading ? '...' : stats?.upcomingSessions || 0}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {thisWeekSessions.length} this week
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-700">
                    Sessions Completed
                  </CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {statsLoading ? '...' : stats?.completedSessions || 0}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    of {stats?.totalSessions || 0} total
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-700">
                    Current Streak
                  </CardTitle>
                  <Zap className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {statsLoading ? '...' : stats?.currentStreak || 0}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    consecutive weeks
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-700">
                    Average Mood
                  </CardTitle>
                  <Heart className="h-4 w-4 text-pink-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {statsLoading ? '...' : `${stats?.averageMoodRating?.toFixed(1) || '0.0'}/10`}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    recent feeling {stats?.averageMoodRating ? getMoodEmoji(stats.averageMoodRating) : '😊'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Upcoming Sessions */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    Next Sessions
                  </CardTitle>
                  <CardDescription>
                    Your upcoming coaching sessions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {sessionsLoading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse h-16 bg-gray-100 rounded"></div>
                      ))}
                    </div>
                  ) : !upcomingSessions || upcomingSessions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="mb-4">No upcoming sessions</p>
                      <Button onClick={() => handleQuickAction('book')} variant="outline">
                        Book Your First Session
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {upcomingSessions.slice(0, 3).map((session) => (
                        <div
                          key={session.id}
                          className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all"
                          onClick={() => handleSessionClick(session.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleSessionClick(session.id);
                            }
                          }}
                          tabIndex={0}
                          role="button"
                          aria-label={`View session: ${session.title} with ${session.coach.firstName} ${session.coach.lastName}`}
                        >
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{session.title}</h4>
                            <p className="text-sm text-gray-600">
                              with {session.coach.firstName} {session.coach.lastName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {format(parseISO(session.scheduledAt), 'PPp')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {session.duration}m
                            </Badge>
                            <ArrowUpRight className="h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                      ))}
                      {upcomingSessions.length > 3 && (
                        <Button 
                          variant="ghost" 
                          className="w-full"
                          onClick={() => router.push('/client/sessions')}
                        >
                          View all sessions
                          <ArrowUpRight className="h-4 w-4 ml-2" />
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-purple-600" />
                    Quick Actions
                  </CardTitle>
                  <CardDescription>
                    Common tasks and shortcuts
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => handleQuickAction('book')}
                  >
                    <Calendar className="h-4 w-4 mr-3" />
                    Book New Session
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => handleQuickAction('message')}
                  >
                    <MessageSquare className="h-4 w-4 mr-3" />
                    Message Coach
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => handleQuickAction('notes')}
                  >
                    <FileText className="h-4 w-4 mr-3" />
                    View Notes
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => handleQuickAction('profile')}
                  >
                    <Settings className="h-4 w-4 mr-3" />
                    Update Profile
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Reflections */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-green-600" />
                    Recent Reflections
                  </CardTitle>
                  <CardDescription>
                    Your latest insights and thoughts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!recentReflections || recentReflections.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="mb-4">No reflections yet</p>
                      <Button 
                        variant="outline" 
                        onClick={() => router.push('/client/reflections')}
                      >
                        Add Your First Reflection
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentReflections.slice(0, 3).map((reflection) => (
                        <div
                          key={reflection.id}
                          className="space-y-2 p-3 border border-gray-200 rounded-lg"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {reflection.sessionTitle && (
                                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                  {reflection.sessionTitle}
                                </Badge>
                              )}
                              {reflection.moodRating && (
                                <span className={`text-sm ${getMoodColor(reflection.moodRating)}`}>
                                  {getMoodEmoji(reflection.moodRating)} {reflection.moodRating}/10
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500">
                              {format(parseISO(reflection.createdAt), 'PP')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 line-clamp-2">
                            {reflection.content}
                          </p>
                        </div>
                      ))}
                      <Button 
                        variant="ghost" 
                        className="w-full"
                        onClick={() => router.push('/client/reflections')}
                      >
                        View all reflections
                        <ArrowUpRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Notifications */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-orange-600" />
                    Recent Notifications
                  </CardTitle>
                  <CardDescription>
                    Latest updates and reminders
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!recentNotifications || recentNotifications.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No recent notifications</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentNotifications.slice(0, 3).map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-3 rounded-lg border ${
                            notification.isRead 
                              ? 'border-gray-200 bg-gray-50' 
                              : 'border-blue-200 bg-blue-50'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 text-sm">
                                {notification.title}
                              </h4>
                              <p className="text-sm text-gray-600 mt-1">
                                {notification.message}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-xs text-gray-500">
                                {format(parseISO(notification.createdAt), 'PP')}
                              </span>
                              {!notification.isRead && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      <Button 
                        variant="ghost" 
                        className="w-full"
                        onClick={() => router.push('/notifications')}
                      >
                        View all notifications
                        <ArrowUpRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Coach Recommendations */}
            {coachRecommendations && coachRecommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-indigo-600" />
                    Recommended Coaches
                  </CardTitle>
                  <CardDescription>
                    Coaches that might be a great fit for you
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {coachRecommendations.map((coach) => (
                      <div
                        key={coach.id}
                        className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer transition-all"
                        onClick={() => router.push(`/client/coaches/${coach.id}`)}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-indigo-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {coach.firstName} {coach.lastName}
                            </h4>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-yellow-500 fill-current" />
                              <span className="text-xs text-gray-600">{coach.rating.toFixed(1)}</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {coach.specializations.slice(0, 2).join(', ')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {coach.sessionsCompleted} sessions completed
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {/* Progress Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    Mood & Session Progress
                  </CardTitle>
                  <CardDescription>
                    Your mood ratings and session frequency over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={progressData}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis 
                          dataKey="name" 
                          className="text-sm text-gray-600"
                        />
                        <YAxis className="text-sm text-gray-600" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="mood" 
                          stroke="#3B82F6" 
                          strokeWidth={2}
                          name="Mood Rating"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="sessions" 
                          stroke="#10B981" 
                          strokeWidth={2}
                          name="Sessions"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-purple-600" />
                    Goal Completion
                  </CardTitle>
                  <CardDescription>
                    Progress towards your coaching goals
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={goalData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {goalData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-center mt-4">
                    <p className="text-2xl font-bold text-gray-900">
                      {stats?.goalsAchieved || 0}
                    </p>
                    <p className="text-sm text-gray-600">Goals Achieved</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Session History Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                  Session Completion Overview
                </CardTitle>
                <CardDescription>
                  Your session activity and completion statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {Math.round(((stats?.completedSessions || 0) / (stats?.totalSessions || 1)) * 100)}%
                    </div>
                    <p className="text-sm text-blue-700">Completion Rate</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {stats?.currentStreak || 0}
                    </div>
                    <p className="text-sm text-green-700">Week Streak</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-3xl font-bold text-purple-600 mb-2">
                      {stats?.totalReflections || 0}
                    </div>
                    <p className="text-sm text-purple-700">Reflections</p>
                  </div>
                </div>
                
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={progressData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis 
                        dataKey="name" 
                        className="text-sm text-gray-600"
                      />
                      <YAxis className="text-sm text-gray-600" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="sessions" 
                        stroke="#10B981" 
                        fill="#10B981"
                        fillOpacity={0.3}
                        name="Sessions"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="goals" className="space-y-6">
            {/* Goal Achievement Display */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-indigo-600" />
                  Goal Achievement Tracking
                </CardTitle>
                <CardDescription>
                  Monitor your progress toward coaching objectives
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="text-center p-6 border-2 border-green-200 bg-green-50 rounded-lg">
                    <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Sessions Complete</h3>
                    <p className="text-3xl font-bold text-green-600 mb-2">
                      {stats?.completedSessions || 0}
                    </p>
                    <p className="text-sm text-gray-600">Total sessions completed</p>
                  </div>

                  <div className="text-center p-6 border-2 border-blue-200 bg-blue-50 rounded-lg">
                    <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Zap className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Consistency Streak</h3>
                    <p className="text-3xl font-bold text-blue-600 mb-2">
                      {stats?.currentStreak || 0}
                    </p>
                    <p className="text-sm text-gray-600">Consecutive weeks active</p>
                  </div>

                  <div className="text-center p-6 border-2 border-purple-200 bg-purple-50 rounded-lg">
                    <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Heart className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Wellbeing Score</h3>
                    <p className="text-3xl font-bold text-purple-600 mb-2">
                      {stats?.averageMoodRating?.toFixed(1) || '0.0'}
                    </p>
                    <p className="text-sm text-gray-600">Average mood rating</p>
                  </div>
                </div>

                <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-4">Achievement Milestones</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Complete 5 sessions</span>
                      <div className="flex items-center gap-2">
                        {(stats?.completedSessions || 0) >= 5 ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                        )}
                        <span className="text-sm text-gray-600">
                          {Math.min(stats?.completedSessions || 0, 5)}/5
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Maintain 4-week streak</span>
                      <div className="flex items-center gap-2">
                        {(stats?.currentStreak || 0) >= 4 ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                        )}
                        <span className="text-sm text-gray-600">
                          {Math.min(stats?.currentStreak || 0, 4)}/4
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Write 10 reflections</span>
                      <div className="flex items-center gap-2">
                        {(stats?.totalReflections || 0) >= 10 ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                        )}
                        <span className="text-sm text-gray-600">
                          {Math.min(stats?.totalReflections || 0, 10)}/10
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Suspense>
    </div>
  );
}
