'use client';

import { useState, Suspense } from 'react';
import { useUser } from '@/lib/store/auth-store';
import { useFilteredSessions, useSessionHistory } from '@/lib/queries/sessions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { 
  Calendar, 
  Clock, 
  TrendingUp, 
  Star, 
  Video,
  Bell,
  BookOpen,
  Target,
  Award,
  AlertCircle,
  CheckCircle2,
  Plus,
  Filter,
  Download
} from 'lucide-react';
import { format, addDays, subDays, parseISO, isFuture, isToday, differenceInMinutes } from 'date-fns';
import type { SessionFilters, SessionListOptions, ViewMode } from '@/types';

// Import our new components
import { EnhancedSessionList } from '@/components/sessions/enhanced-session-list';

// Quick stats component
interface QuickStatsProps {
  userId: string;
}

function QuickStats({ userId }: QuickStatsProps) {
  const { data: sessionHistory } = useSessionHistory(userId);
  
  const stats = sessionHistory?.stats || {
    total: 0,
    completed: 0,
    upcoming: 0,
    cancelled: 0,
    totalHours: 0,
    avgRating: 0,
    completionRate: 0,
    monthlyGrowth: 0
  };

  const statCards = [
    {
      title: 'Total Sessions',
      value: stats.total,
      icon: <Calendar className="h-5 w-5" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Completed',
      value: stats.completed,
      icon: <CheckCircle2 className="h-5 w-5" />,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Total Hours',
      value: `${stats.totalHours.toFixed(1)}h`,
      icon: <Clock className="h-5 w-5" />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Avg Rating',
      value: stats.avgRating > 0 ? stats.avgRating.toFixed(1) : 'N/A',
      icon: <Star className="h-5 w-5" />,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
              <div className={`p-2 rounded-lg ${stat.bgColor} ${stat.color}`}>
                {stat.icon}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Upcoming sessions widget
interface UpcomingSessionsProps {
  userId: string;
}

function UpcomingSessions({ userId }: UpcomingSessionsProps) {
  const { data: sessionsData } = useFilteredSessions(userId, {
    filters: { status: ['scheduled'] },
    sortBy: 'date',
    sortOrder: 'asc',
    limit: 3
  });

  const upcomingSessions = sessionsData?.data || [];
  const nextSession = upcomingSessions[0];

  const getTimeUntilSession = (scheduledAt: string) => {
    const sessionTime = parseISO(scheduledAt);
    const now = new Date();
    const diffMinutes = differenceInMinutes(sessionTime, now);
    
    if (diffMinutes < 60) {
      return `${diffMinutes} minutes`;
    } else if (diffMinutes < 1440) {
      const hours = Math.floor(diffMinutes / 60);
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
      const days = Math.floor(diffMinutes / 1440);
      return `${days} day${days !== 1 ? 's' : ''}`;
    }
  };

  if (upcomingSessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Sessions
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">No upcoming sessions scheduled</p>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Book a Session
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Upcoming Sessions
        </CardTitle>
        <CardDescription>
          You have {upcomingSessions.length} session{upcomingSessions.length !== 1 ? 's' : ''} coming up
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Next Session Highlight */}
        {nextSession && (
          <div className="p-4 rounded-lg border-2 border-blue-200 bg-blue-50">
            <div className="flex items-center justify-between mb-2">
              <Badge className="bg-blue-100 text-blue-800">
                {isToday(parseISO(nextSession.scheduledAt)) ? 'Today' : 'Next Session'}
              </Badge>
              {isFuture(parseISO(nextSession.scheduledAt)) && differenceInMinutes(parseISO(nextSession.scheduledAt), new Date()) <= 30 && (
                <Badge className="bg-orange-100 text-orange-800">
                  <Bell className="h-3 w-3 mr-1" />
                  Starting Soon
                </Badge>
              )}
            </div>
            <h4 className="font-semibold text-blue-900">{nextSession.title}</h4>
            <div className="flex items-center gap-4 mt-2 text-sm text-blue-700">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(parseISO(nextSession.scheduledAt), 'PPP')}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {format(parseISO(nextSession.scheduledAt), 'p')}
              </span>
              <span className="flex items-center gap-1">
                <Video className="h-4 w-4" />
                {nextSession.duration} min
              </span>
            </div>
            <p className="text-sm text-blue-600 mt-2">
              Starts in {getTimeUntilSession(nextSession.scheduledAt)}
            </p>
          </div>
        )}
        
        {/* Other Upcoming Sessions */}
        {upcomingSessions.slice(1).map((session) => (
          <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="space-y-1">
              <h5 className="font-medium">{session.title}</h5>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{format(parseISO(session.scheduledAt), 'MMM d, p')}</span>
                <span>•</span>
                <span>{session.duration} min</span>
              </div>
            </div>
            <Badge variant="outline">Scheduled</Badge>
          </div>
        ))}
        
        {upcomingSessions.length > 0 && (
          <div className="pt-2 border-t">
            <Button variant="outline" className="w-full">
              View All Sessions
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Progress tracking widget
interface ProgressTrackingProps {
  userId: string;
}

function ProgressTracking({ userId }: ProgressTrackingProps) {
  const { data: sessionHistory } = useSessionHistory(userId, {
    from: subDays(new Date(), 30),
    to: new Date()
  });

  const progress = sessionHistory?.progress || {
    goalsCompleted: 0,
    totalGoals: 0,
    streakDays: 0,
    improvementAreas: [],
    achievements: []
  };

  const completionRate = progress.totalGoals > 0 ? (progress.goalsCompleted / progress.totalGoals) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Progress Tracking
        </CardTitle>
        <CardDescription>Your coaching journey overview</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Goal Completion */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Goals Completed</span>
            <span className="text-sm text-muted-foreground">
              {progress.goalsCompleted}/{progress.totalGoals}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full" 
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {completionRate.toFixed(0)}% completion rate
          </p>
        </div>

        {/* Recent Achievements */}
        {progress.achievements.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Award className="h-4 w-4" />
              Recent Achievements
            </h4>
            <div className="space-y-1">
              {progress.achievements.slice(0, 3).map((achievement, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  <span>{achievement}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Session Streak */}
        {progress.streakDays > 0 && (
          <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg">
            <TrendingUp className="h-4 w-4 text-orange-600" />
            <span className="text-sm font-medium text-orange-700">
              {progress.streakDays} day session streak!
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Main page component
export default function ClientSessionsPage() {
  const user = useUser();
  const [activeTab, setActiveTab] = useState('overview');

  if (!user) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You need to be logged in to view your sessions.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const userId = user.id;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Sessions</h1>
          <p className="text-muted-foreground">
            Manage your coaching sessions, track progress, and stay on top of your goals.
          </p>
        </div>
        
        <div className="flex items-center gap-2 mt-4 sm:mt-0">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Book Session
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="all-sessions">All Sessions</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Quick Stats */}
          <Suspense fallback={<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"><LoadingSpinner /></div>}>
            <QuickStats userId={userId} />
          </Suspense>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Sessions */}
            <Suspense fallback={<LoadingSpinner />}>
              <UpcomingSessions userId={userId} />
            </Suspense>

            {/* Progress Tracking */}
            <Suspense fallback={<LoadingSpinner />}>
              <ProgressTracking userId={userId} />
            </Suspense>
          </div>

          {/* Recent Sessions Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Sessions</CardTitle>
              <CardDescription>Your latest coaching sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<LoadingSpinner />}>
                <EnhancedSessionList 
                  clientId={userId}
                  showFilters={false}
                  initialViewMode="list"
                  maxResults={5}
                />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all-sessions" className="space-y-6">
          <Suspense fallback={<LoadingSpinner />}>
            <EnhancedSessionList 
              clientId={userId}
              showFilters={true}
              initialViewMode="list"
              maxResults={25}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Suspense fallback={<LoadingSpinner />}>
            <EnhancedSessionList 
              clientId={userId}
              showFilters={true}
              initialViewMode="timeline"
              maxResults={50}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Session Analytics</CardTitle>
              <CardDescription>
                Detailed insights into your coaching progress and session patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <TrendingUp className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Analytics Coming Soon</h3>
                <p className="text-muted-foreground mb-6">
                  We're working on detailed analytics and insights for your coaching sessions.
                </p>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export Session Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}