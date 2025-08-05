'use client';

import { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useUser } from '@/lib/store/auth-store';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  Users, 
  Clock, 
  TrendingUp, 
  CheckCircle,
  MessageSquare,
  Star,
  ArrowUpRight,
  UserPlus
} from 'lucide-react';
import { SessionList } from '@/components/sessions/session-list';
import { SessionCalendar } from '@/components/sessions/session-calendar';
import { CoachClientsPage } from '@/components/coach/clients-page';
import { format, parseISO, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import type { Session } from '@/types';

// Helper function moved outside component to prevent re-creation
const getActivityIcon = (type: RecentActivity['type']) => {
  switch (type) {
    case 'session_completed':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'note_added':
      return <MessageSquare className="h-4 w-4 text-blue-600" />;
    case 'client_joined':
      return <UserPlus className="h-4 w-4 text-purple-600" />;
    case 'session_scheduled':
      return <Calendar className="h-4 w-4 text-orange-600" />;
    default:
      return <Clock className="h-4 w-4 text-gray-600" />;
  }
};

interface DashboardStats {
  totalSessions: number;
  completedSessions: number;
  upcomingSessions: number;
  totalClients: number;
  activeClients: number;
  thisWeekSessions: number;
  averageRating: number;
  totalRevenue: number;
}

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  lastSession?: string;
  totalSessions: number;
  status: 'active' | 'inactive';
}

interface RecentActivity {
  id: string;
  type: 'session_completed' | 'note_added' | 'client_joined' | 'session_scheduled';
  description: string;
  timestamp: string;
  clientName?: string;
}

export function CoachDashboard() {
  const t = useTranslations('dashboard');
  const user = useUser();
  
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['coach-stats', user?.id],
    queryFn: async (): Promise<DashboardStats> => {
      const response = await fetch('/api/coach/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch coach statistics');
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
      const response = await fetch(`/api/sessions?coachId=${user?.id}&status=scheduled&limit=5&sortOrder=asc`);
      if (!response.ok) throw new Error('Failed to fetch sessions');
      const data = await response.json();
      return data.data;
    },
    enabled: !!user?.id,
  });

  // Fetch recent clients
  const { data: recentClients } = useQuery({
    queryKey: ['recent-clients', user?.id],
    queryFn: async (): Promise<Client[]> => {
      const response = await fetch('/api/coach/clients?limit=5');
      if (!response.ok) {
        throw new Error('Failed to fetch recent clients');
      }
      const result = await response.json();
      return result.data;
    },
    enabled: !!user?.id,
  });

  // Fetch recent activity
  const { data: recentActivity } = useQuery({
    queryKey: ['recent-activity', user?.id],
    queryFn: async (): Promise<RecentActivity[]> => {
      const response = await fetch('/api/coach/activity?limit=10');
      if (!response.ok) {
        throw new Error('Failed to fetch recent activity');
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
        {statsLoading ? 'Loading coach dashboard statistics...' : 'Coach dashboard loaded successfully'}
      </div>
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Coach Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.firstName}! Here&apos;s your coaching overview.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md" role="tablist" aria-label="Coach dashboard navigation">
          <TabsTrigger value="overview" aria-label="Overview dashboard">Overview</TabsTrigger>
          <TabsTrigger value="sessions" aria-label="Sessions management">Sessions</TabsTrigger>
          <TabsTrigger value="clients" aria-label="Client management">Clients</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card data-testid="upcoming-sessions">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('stats.upcomingSessions')}
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

            <Card data-testid="total-clients">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('stats.activeClients')}
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? '...' : stats?.activeClients || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  of {stats?.totalClients || 0} total clients
                </p>
              </CardContent>
            </Card>

            <Card data-testid="completed-sessions">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('stats.completedSessions')}
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

            <Card data-testid="monthly-revenue">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Average Rating
                </CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? '...' : stats?.averageRating || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  from client feedback
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Sessions */}
            <Card data-testid="upcoming-sessions-list">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Next Sessions
                </CardTitle>
                <CardDescription>
                  Your upcoming scheduled sessions
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
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <h4 className="font-medium">{session.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            with {session.client.firstName} {session.client.lastName}
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

            {/* Recent Activity */}
            <Card data-testid="recent-notes">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>
                  Your latest coaching activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!recentActivity || recentActivity.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No recent activity</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3"
                      >
                        {getActivityIcon(activity.type)}
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium">
                            {activity.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(activity.timestamp), 'PPp')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Clients */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Recent Clients
              </CardTitle>
              <CardDescription>
                Clients you&apos;ve worked with recently
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!recentClients || recentClients.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No recent clients</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recentClients.map((client) => (
                    <div
                      key={client.id}
                      className="flex items-center gap-3 p-3 border rounded-lg"
                    >
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {client.firstName[0]}{client.lastName[0]}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">
                          {client.firstName} {client.lastName}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {client.totalSessions} sessions
                        </p>
                        {client.lastSession && (
                          <p className="text-xs text-muted-foreground">
                            Last: {format(parseISO(client.lastSession), 'PP')}
                          </p>
                        )}
                      </div>
                      <Badge 
                        variant={client.status === 'active' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {client.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
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
                coachId={user?.id}
                limit={20}
              />
            </TabsContent>
            
            <TabsContent value="calendar">
              <SessionCalendar
                coachId={user?.id}
                onSessionClick={(session) => {
                  // Navigate to session details
                  window.location.href = `/sessions/${session.id}`;
                }}
              />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="clients" className="space-y-6">
          <CoachClientsPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}