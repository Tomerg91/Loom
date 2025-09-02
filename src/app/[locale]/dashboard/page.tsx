import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getServerUser } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Users, MessageSquare, TrendingUp, Clock, CheckCircle } from 'lucide-react';

interface DashboardPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dashboard' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params;
  
  // Load translations and user in parallel for better TTFB
  const [translationsResult, commonTranslationsResult, userResult] = await Promise.allSettled([
    getTranslations({ locale, namespace: 'dashboard' }),
    getTranslations({ locale, namespace: 'common' }),
    getServerUser()
  ]);
  
  const user = userResult.status === 'fulfilled' ? userResult.value : null;
  if (!user) {
    redirect(`/${locale}/auth/signin`);
  }

  const t = translationsResult.status === 'fulfilled' ? translationsResult.value : (() => (key: string) => key)();
  const commonT = commonTranslationsResult.status === 'fulfilled' ? commonTranslationsResult.value : (() => (key: string) => key)();

  // Mock data - will be replaced with real data from database
  const mockStats = {
    totalSessions: 24,
    upcomingSessions: 3,
    completedSessions: 21,
    totalClients: user.role === 'coach' ? 8 : undefined,
    unreadNotifications: 5,
  };

  const mockUpcomingSessions = [
    {
      id: '1',
      title: 'Weekly Check-in',
      scheduledAt: '2024-01-15T10:00:00Z',
      participantName: user.role === 'coach' ? 'Sarah Johnson' : 'Dr. Michael Cohen',
      participantRole: user.role === 'coach' ? 'Client' : 'Coach',
    },
    {
      id: '2', 
      title: 'Goal Setting Session',
      scheduledAt: '2024-01-16T14:30:00Z',
      participantName: user.role === 'coach' ? 'David Lee' : 'Dr. Rachel Gold',
      participantRole: user.role === 'coach' ? 'Client' : 'Coach',
    },
  ];

  return (
    <AppLayout>
      {/* Header */}
      <div className="border-b bg-card/60 backdrop-blur supports-[backdrop-filter]:backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="page-title text-foreground">
                {t('welcome', { name: user.firstName || user.email })}
              </h1>
              <p className="page-subtitle mt-1">
                {t('subtitle')}
              </p>
            </div>
            <Badge variant={user.role === 'admin' ? 'default' : user.role === 'coach' ? 'secondary' : 'outline'}>
              {user.role === 'admin' ? t('roles.admin') : user.role === 'coach' ? t('roles.coach') : t('roles.client')}
            </Badge>
          </div>
          <div className="premium-divider mt-4" />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" data-testid="dashboard-stats-grid">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('stats.totalSessions')}
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockStats.totalSessions}</div>
              <p className="text-xs text-muted-foreground">
                {t('stats.allTime')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('stats.upcomingSessions')}
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockStats.upcomingSessions}</div>
              <p className="text-xs text-muted-foreground">
                {t('stats.thisWeek')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('stats.completedSessions')}
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockStats.completedSessions}</div>
              <p className="text-xs text-muted-foreground">
                {t('stats.thisMonth')}
              </p>
            </CardContent>
          </Card>

          {user.role === 'coach' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('stats.activeClients')}
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockStats.totalClients}</div>
                <p className="text-xs text-muted-foreground">
                  {t('stats.total')}
                </p>
              </CardContent>
            </Card>
          )}

          {user.role === 'client' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t('stats.notifications')}
                </CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockStats.unreadNotifications}</div>
                <p className="text-xs text-muted-foreground">
                  {t('stats.unread')}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upcoming Sessions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {t('upcomingSessions.title')}
              </CardTitle>
              <CardDescription>
                {t('upcomingSessions.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {mockUpcomingSessions.length > 0 ? (
                mockUpcomingSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <h4 className="font-medium">{session.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {t('upcomingSessions.with')} {session.participantName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(session.scheduledAt).toLocaleDateString(locale, {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" data-testid="view-session-button">
                      {commonT('view')}
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t('upcomingSessions.empty')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {t('quickActions.title')}
              </CardTitle>
              <CardDescription>
                {t('quickActions.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {user.role === 'coach' ? (
                <>
                  <Button className="w-full justify-start" variant="outline" data-testid="schedule-session-action">
                    <Calendar className="mr-2 h-4 w-4" />
                    {t('quickActions.scheduleSession')}
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Users className="mr-2 h-4 w-4" />
                    {t('quickActions.viewClients')}
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    {t('quickActions.addNote')}
                  </Button>
                </>
              ) : (
                <>
                  <Button className="w-full justify-start" variant="outline" data-testid="book-session-action">
                    <Calendar className="mr-2 h-4 w-4" />
                    {t('quickActions.bookSession')}
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    {t('quickActions.addReflection')}
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    {t('quickActions.viewProgress')}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
