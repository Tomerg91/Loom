'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import {
  Calendar,
  Users,
  Clock,
  TrendingUp,
  CheckCircle,
  MessageSquare,
  ArrowUpRight,
  UserPlus,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, useMemo, useCallback } from 'react';

import { AddClientModal } from '@/components/coach/add-client-modal';
import { AddSessionModal } from '@/components/coach/add-session-modal';
import { CoachClientsPage } from '@/components/coach/clients-page';
import { EmptyState } from '@/components/coach/empty-state';
import { ReflectionSpaceWidget } from '@/components/coach/reflection-space-widget';
import { SessionCalendar } from '@/components/sessions/session-calendar';
import { SessionList } from '@/components/sessions/session-list';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiGet } from '@/lib/api/client-api-request';
import { useUser } from '@/lib/auth/use-user';
import { useCoachDashboardSubscriptions } from '@/lib/hooks/use-coach-dashboard-subscriptions';
import type { Session } from '@/types';

// Helper function moved outside component to prevent re-creation
// Updated with Satya Method colors: moss green for completion, teal for actions
const getActivityIcon = (type: RecentActivity['type']) => {
  switch (type) {
    case 'session_completed':
      return <CheckCircle className="h-4 w-4 text-moss-600" />;
    case 'note_added':
      return <MessageSquare className="h-4 w-4 text-teal-600" />;
    case 'client_joined':
      return <UserPlus className="h-4 w-4 text-teal-500" />;
    case 'session_scheduled':
      return <Calendar className="h-4 w-4 text-teal-600" />;
    default:
      return <Clock className="h-4 w-4 text-sand-500" />;
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
  status: 'active' | 'inactive' | 'pending';
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
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('overview');
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showAddSessionModal, setShowAddSessionModal] = useState(false);

  // Initialize realtime subscriptions
  const { isConnected, connectionStatus } = useCoachDashboardSubscriptions(
    user?.id ?? ''
  );

  // Refresh data every 1 minute (reduced from 5 minutes for fallback)
  const refreshInterval = 1 * 60 * 1000; // 1 minute in milliseconds

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['coach-stats', user?.id],
    queryFn: async (): Promise<DashboardStats> => {
      const result = await apiGet<{ data: DashboardStats }>('/api/coach/stats');
      return result.data;
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // Data is fresh for 2 minutes
    refetchInterval: refreshInterval, // Auto-refresh every 5 minutes
    refetchIntervalInBackground: true,
  });

  // Fetch upcoming sessions
  const { data: upcomingSessions } = useQuery({
    queryKey: ['upcoming-sessions', user?.id],
    queryFn: async (): Promise<Session[]> => {
      const data = await apiGet<{ data: Session[] }>(`/api/sessions?coachId=${user?.id}&status=scheduled&limit=5&sortOrder=asc`);
      return data.data;
    },
    enabled: !!user?.id,
    staleTime: 1 * 60 * 1000, // Sessions are fresh for 1 minute
    refetchInterval: refreshInterval,
  });

  // Fetch recent clients
  const { data: recentClients } = useQuery({
    queryKey: ['recent-clients', user?.id],
    queryFn: async (): Promise<Client[]> => {
      const result = await apiGet<{ data: Client[] }>('/api/coach/clients?limit=5');
      return result.data;
    },
    enabled: !!user?.id,
    staleTime: 3 * 60 * 1000, // Client data is fresh for 3 minutes
    refetchInterval: refreshInterval,
  });

  // Fetch recent activity
  const { data: recentActivity } = useQuery({
    queryKey: ['recent-activity', user?.id],
    queryFn: async (): Promise<RecentActivity[]> => {
      const result = await apiGet<{ data: RecentActivity[] }>('/api/coach/activity?limit=10');
      return result.data;
    },
    enabled: !!user?.id,
    staleTime: 1 * 60 * 1000, // Activity is fresh for 1 minute
    refetchInterval: refreshInterval,
  });

  // Callback to refresh data when actions are taken
  const refreshDashboardData = useCallback(() => {
    const userId = user?.id;
    if (!userId) return;

    queryClient.invalidateQueries({ queryKey: ['coach-stats', userId] });
    queryClient.invalidateQueries({ queryKey: ['upcoming-sessions', userId] });
    queryClient.invalidateQueries({ queryKey: ['recent-clients', userId] });
    queryClient.invalidateQueries({ queryKey: ['recent-activity', userId] });
    queryClient.invalidateQueries({ queryKey: ['coach-clients', userId] });
    queryClient.invalidateQueries({ queryKey: ['coach-clients-list', userId] });
  }, [queryClient, user?.id]);

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
      
      {/* Header - Satya Method */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-sand-900">{t('coachTitle')}</h1>
          <p className="text-sand-500 mt-1">
            {t('welcome', { name: user?.firstName || '' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Connection Status Indicator */}
          {connectionStatus === 'connected' && (
            <div className="flex items-center gap-1.5" role="status" aria-live="polite">
              <div className="h-2 w-2 rounded-full bg-green-500" aria-hidden="true" />
              <span className="text-xs text-muted-foreground">Realtime</span>
              <span className="sr-only">Dashboard is connected to realtime updates</span>
            </div>
          )}
          {connectionStatus === 'disconnected' && (
            <div className="flex items-center gap-1.5" role="status" aria-live="polite">
              <div className="h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
              <span className="text-xs text-muted-foreground">Polling</span>
              <span className="sr-only">Dashboard using polling mode, not realtime</span>
            </div>
          )}
          {connectionStatus === 'reconnecting' && (
            <div className="flex items-center gap-1.5" role="status" aria-live="assertive">
              <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" aria-hidden="true" />
              <span className="text-xs text-muted-foreground">Connecting...</span>
              <span className="sr-only">Dashboard reconnecting to realtime updates</span>
            </div>
          )}
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowAddClientModal(true)}
              className="gap-2"
            >
              <UserPlus className="h-4 w-4" />
              {t('recentClients.emptyAction')}
            </Button>
            <Button
              onClick={() => setShowAddSessionModal(true)}
              className="gap-2"
            >
              <Calendar className="h-4 w-4" />
              {t('upcomingSessions.emptyAction')}
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md" role="tablist" aria-label="Coach dashboard navigation">
          <TabsTrigger value="overview" aria-label="Overview dashboard">{t('tabs.overview')}</TabsTrigger>
          <TabsTrigger value="sessions" aria-label="Sessions management">{t('tabs.sessions')}</TabsTrigger>
          <TabsTrigger value="clients" aria-label="Client management">{t('tabs.clients')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Grid - Satya Method: Focus on practice, not business */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card data-testid="upcoming-sessions">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-sand-700">
                  {t('stats.upcomingSessions')}
                </CardTitle>
                <Clock className="h-4 w-4 text-teal-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-sand-900">
                  {statsLoading ? '...' : stats?.upcomingSessions || 0}
                </div>
                <p className="text-xs text-sand-500">
                  {thisWeekSessions.length} {t('stats.thisWeek')}
                </p>
              </CardContent>
            </Card>

            <Card data-testid="total-clients">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-sand-700">
                  {t('stats.activeClients')}
                </CardTitle>
                <Users className="h-4 w-4 text-teal-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-sand-900">
                  {statsLoading ? '...' : stats?.activeClients || 0}
                </div>
                <p className="text-xs text-sand-500">
                  {t('stats.of')} {stats?.totalClients || 0} {t('stats.total')}
                </p>
              </CardContent>
            </Card>

            <Card data-testid="completed-sessions">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-sand-700">
                  {t('stats.completedSessions')}
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-moss-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-sand-900">
                  {statsLoading ? '...' : stats?.completedSessions || 0}
                </div>
                <p className="text-xs text-sand-500">
                  {t('stats.of')} {stats?.totalSessions || 0} {t('stats.total')}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Widgets Grid - Satya Method Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upcoming Sessions */}
            <Card data-testid="upcoming-sessions-list" className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sand-900">
                  <Calendar className="h-5 w-5 text-teal-600" />
                  {t('upcomingSessions.title')}
                </CardTitle>
                <CardDescription className="text-sand-500">
                  {t('upcomingSessions.description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!upcomingSessions || upcomingSessions.length === 0 ? (
                  <EmptyState
                    icon={Calendar}
                    title={t('upcomingSessions.emptyTitle')}
                    description={t('upcomingSessions.emptyDescription')}
                    actionLabel={t('upcomingSessions.emptyAction')}
                    onAction={() => setShowAddSessionModal(true)}
                  />
                ) : (
                  <div className="space-y-4">
                    {upcomingSessions.slice(0, 3).map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between p-3 border border-sand-200 rounded-lg hover:border-teal-200 transition-colors"
                      >
                        <div>
                          <h4 className="font-medium text-sand-900">{session.title}</h4>
                          <p className="text-sm text-sand-500">
                            {t('upcomingSessions.with')} {session.client.firstName} {session.client.lastName}
                          </p>
                          <p className="text-xs text-sand-400">
                            {format(parseISO(session.scheduledAt), 'PPp')}
                          </p>
                        </div>
                        <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">
                          {session.duration}{t('upcomingSessions.duration')}
                        </Badge>
                      </div>
                    ))}
                    {upcomingSessions.length > 3 && (
                      <Button
                        variant="ghost"
                        className="w-full text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                        onClick={() => setActiveTab('sessions')}
                      >
                        {t('upcomingSessions.viewAll')}
                        <ArrowUpRight className="h-4 w-4 ml-2" />
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Space for Reflection Widget - NEW */}
            <ReflectionSpaceWidget className="lg:col-span-1" />
          </div>

          {/* Recent Activity */}
          <Card data-testid="recent-activity">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sand-900">
                <TrendingUp className="h-5 w-5 text-teal-600" />
                {t('recentActivity.title')}
              </CardTitle>
              <CardDescription className="text-sand-500">
                {t('recentActivity.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!recentActivity || recentActivity.length === 0 ? (
                <div className="text-center py-6 text-sand-400">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t('recentActivity.empty')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-3 border border-sand-200 rounded-lg"
                    >
                      {getActivityIcon(activity.type)}
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium text-sand-900">
                          {activity.description}
                        </p>
                        <p className="text-xs text-sand-400">
                          {format(parseISO(activity.timestamp), 'PPp')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Clients - Satya Method: "מתאמנים" (Practitioners) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sand-900">
                <Users className="h-5 w-5 text-teal-600" />
                {t('recentClients.title')}
              </CardTitle>
              <CardDescription className="text-sand-500">
                {t('recentClients.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!recentClients || recentClients.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title={t('recentClients.emptyTitle')}
                  description={t('recentClients.emptyDescription')}
                  actionLabel={t('recentClients.emptyAction')}
                  onAction={() => setShowAddClientModal(true)}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recentClients.map((client) => (
                    <div
                      key={client.id}
                      className="flex items-center gap-3 p-3 border border-sand-200 rounded-lg hover:border-teal-200 transition-colors"
                    >
                      <div className="w-10 h-10 bg-teal-50 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-teal-700">
                          {client.firstName[0]}{client.lastName[0]}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm text-sand-900">
                          {client.firstName} {client.lastName}
                        </h4>
                        <p className="text-xs text-sand-500">
                          {client.totalSessions} {t('recentClients.sessions')}
                        </p>
                        {client.lastSession && (
                          <p className="text-xs text-sand-400">
                            {t('recentClients.lastSession')}: {format(parseISO(client.lastSession), 'PP')}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={client.status === 'active' ? 'success' : 'secondary'}
                        className="text-xs"
                      >
                        {t(`recentClients.status.${client.status}`)}
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
                  router.push(`/sessions/${session.id}`);
                }}
              />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="clients" className="space-y-6">
          <CoachClientsPage />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <AddClientModal
        open={showAddClientModal}
        onOpenChange={setShowAddClientModal}
        onSuccess={refreshDashboardData}
      />
      <AddSessionModal
        open={showAddSessionModal}
        onOpenChange={setShowAddSessionModal}
        coachId={user?.id}
        onSuccess={refreshDashboardData}
      />
    </div>
  );
}

// Export as default for dynamic imports
export default CoachDashboard;

// Also export with the expected name for compatibility
export { CoachDashboard as CoachDashboardComponent };
