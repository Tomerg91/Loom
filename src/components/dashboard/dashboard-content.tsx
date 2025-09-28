'use client';

import { useQuery } from '@tanstack/react-query';
import type { LucideIcon } from 'lucide-react';
import {
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Flame,
  MessageSquare,
  Smile,
  Star,
  Target,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import { useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/routing';
import { useUser } from '@/lib/store/auth-store';
import type { Session } from '@/types';

interface DashboardContentProps {
  translations: {
    dashboard: (key: string, values?: Record<string, unknown>) => string;
    common: (key: string) => string;
  };
  locale: string;
}

type UserRole = 'coach' | 'client' | 'admin' | string;

interface CoachStats {
  totalSessions: number;
  completedSessions: number;
  upcomingSessions: number;
  totalClients: number;
  activeClients: number;
  thisWeekSessions: number;
  averageRating: number;
  totalRevenue: number;
}

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

interface AdminOverview {
  totalUsers: number;
  activeUsers: number;
  totalSessions: number;
  completedSessions: number;
  revenue: number;
  averageRating: number;
  newUsersThisMonth: number;
  completionRate: number;
  totalCoaches: number;
  totalClients: number;
  activeCoaches: number;
  averageSessionsPerUser: number;
}

interface DashboardResult {
  stats: CoachStats | ClientStats | AdminOverview;
  upcomingSessions: Session[];
}

interface StatCardConfig {
  key: string;
  title: string;
  value: string;
  helper?: string;
  icon: LucideIcon;
}

type AppRoute = Parameters<typeof Link>[0]['href'];

interface QuickActionConfig {
  key: string;
  label: string;
  icon: LucideIcon;
  href: AppRoute;
}

const UPCOMING_LIMIT = 5;
const DEFAULT_CURRENCY = 'USD';

const resolveCurrency = (locale: string) => {
  if (locale?.startsWith('he')) {
    return 'ILS';
  }
  return DEFAULT_CURRENCY;
};

const defaultCoachStats: CoachStats = {
  totalSessions: 0,
  completedSessions: 0,
  upcomingSessions: 0,
  totalClients: 0,
  activeClients: 0,
  thisWeekSessions: 0,
  averageRating: 0,
  totalRevenue: 0,
};

const defaultClientStats: ClientStats = {
  totalSessions: 0,
  completedSessions: 0,
  upcomingSessions: 0,
  totalReflections: 0,
  thisWeekSessions: 0,
  averageMoodRating: 0,
  goalsAchieved: 0,
  currentStreak: 0,
};

const defaultAdminOverview: AdminOverview = {
  totalUsers: 0,
  activeUsers: 0,
  totalSessions: 0,
  completedSessions: 0,
  revenue: 0,
  averageRating: 0,
  newUsersThisMonth: 0,
  completionRate: 0,
  totalCoaches: 0,
  totalClients: 0,
  activeCoaches: 0,
  averageSessionsPerUser: 0,
};

async function fetchDashboardData(role: UserRole, userId: string): Promise<DashboardResult> {
  const statsUrl = role === 'coach'
    ? '/api/coach/stats'
    : role === 'client'
      ? '/api/client/stats'
      : '/api/admin/dashboard?timeRange=30d';

  const sessionQuery = new URLSearchParams({
    status: 'scheduled',
    sortOrder: 'asc',
    limit: String(UPCOMING_LIMIT),
  });

  if (role === 'coach') {
    sessionQuery.set('coachId', userId);
  } else if (role === 'client') {
    sessionQuery.set('clientId', userId);
  }

  const [statsResponse, sessionsResponse] = await Promise.all([
    fetch(statsUrl, { cache: 'no-store', credentials: 'same-origin' }),
    fetch(`/api/sessions?${sessionQuery.toString()}`, { cache: 'no-store', credentials: 'same-origin' }),
  ]);

  if (!statsResponse.ok) {
    throw new Error('Failed to load dashboard statistics');
  }

  const statsPayload = await statsResponse.json();
  let stats: CoachStats | ClientStats | AdminOverview;

  if (role === 'coach') {
    stats = {
      ...defaultCoachStats,
      ...((statsPayload.data ?? {}) as Partial<CoachStats>),
    };
  } else if (role === 'client') {
    stats = {
      ...defaultClientStats,
      ...((statsPayload.data ?? {}) as Partial<ClientStats>),
    };
  } else {
    const overview = (statsPayload.data?.overview ?? {}) as Partial<AdminOverview>;
    stats = {
      ...defaultAdminOverview,
      ...overview,
    };
  }

  let upcomingSessions: Session[] = [];
  if (sessionsResponse.ok) {
    try {
      const sessionsPayload = await sessionsResponse.json();
      const sessions = (sessionsPayload.data ?? []) as Session[];
      const now = new Date();
      upcomingSessions = sessions
        .filter((session) => {
          const scheduled = new Date(session.scheduledAt);
          return Number.isFinite(scheduled.getTime()) && scheduled >= now;
        })
        .slice(0, UPCOMING_LIMIT);
    } catch (error) {
      console.warn('Failed to parse upcoming sessions payload', error);
    }
  }

  return { stats, upcomingSessions };
}

function buildDisplayName(person?: { firstName?: string | null; lastName?: string | null; email?: string | null }) {
  if (!person) {
    return '—';
  }
  const segments = [person.firstName, person.lastName].filter(Boolean);
  const fullName = segments.join(' ');
  return fullName || person.email || '—';
}

export function DashboardContent({ translations, locale }: DashboardContentProps) {
  const user = useUser();
  const { dashboard: t, common: commonT } = translations;

  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: resolveCurrency(locale),
        maximumFractionDigits: 0,
      }),
    [locale]
  );
  const decimalFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    [locale]
  );
  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [locale]
  );

  const role = user?.role as UserRole | undefined;

  const { data, isLoading, isError } = useQuery<DashboardResult>({
    queryKey: ['dashboard-overview', user?.id, role],
    queryFn: () => fetchDashboardData(role ?? 'client', user!.id),
    enabled: Boolean(user?.id && role),
    staleTime: 60_000,
  });

  const statsCards = useMemo<StatCardConfig[]>(() => {
    if (!user?.role || !data?.stats) {
      return [];
    }

    if (user.role === 'coach') {
      const stats = data.stats as CoachStats;
      return [
        {
          key: 'total-sessions',
          title: t('stats.totalSessions'),
          value: numberFormatter.format(stats.totalSessions),
          helper: t('stats.allTime'),
          icon: Calendar,
        },
        {
          key: 'upcoming-sessions',
          title: t('stats.upcomingSessions'),
          value: numberFormatter.format(stats.upcomingSessions),
          helper: t('stats.thisWeek'),
          icon: Clock,
        },
        {
          key: 'completed-sessions',
          title: t('stats.completedSessions'),
          value: numberFormatter.format(stats.completedSessions),
          helper: t('stats.thisMonth'),
          icon: CheckCircle,
        },
        {
          key: 'active-clients',
          title: t('stats.activeClients'),
          value: numberFormatter.format(stats.activeClients || stats.totalClients),
          helper: t('stats.total'),
          icon: Users,
        },
        {
          key: 'average-rating',
          title: t('stats.averageRating'),
          value: stats.averageRating > 0 ? decimalFormatter.format(stats.averageRating) : '—',
          helper: t('stats.allTime'),
          icon: Star,
        },
        {
          key: 'revenue',
          title: t('stats.totalRevenue'),
          value: currencyFormatter.format(stats.totalRevenue || 0),
          helper: t('stats.thisMonth'),
          icon: DollarSign,
        },
      ];
    }

    if (user.role === 'client') {
      const stats = data.stats as ClientStats;
      return [
        {
          key: 'total-sessions',
          title: t('stats.totalSessions'),
          value: numberFormatter.format(stats.totalSessions),
          helper: t('stats.allTime'),
          icon: Calendar,
        },
        {
          key: 'upcoming-sessions',
          title: t('stats.upcomingSessions'),
          value: numberFormatter.format(stats.upcomingSessions),
          helper: t('stats.thisWeek'),
          icon: Clock,
        },
        {
          key: 'completed-sessions',
          title: t('stats.completedSessions'),
          value: numberFormatter.format(stats.completedSessions),
          helper: t('stats.thisMonth'),
          icon: CheckCircle,
        },
        {
          key: 'reflections',
          title: t('stats.totalReflections'),
          value: numberFormatter.format(stats.totalReflections),
          helper: t('stats.allTime'),
          icon: MessageSquare,
        },
        {
          key: 'average-mood',
          title: t('stats.averageMood'),
          value: stats.averageMoodRating > 0 ? decimalFormatter.format(stats.averageMoodRating) : '—',
          helper: t('stats.allTime'),
          icon: Smile,
        },
        {
          key: 'goals-achieved',
          title: t('stats.goalsAchieved'),
          value: numberFormatter.format(stats.goalsAchieved),
          helper: t('stats.allTime'),
          icon: Target,
        },
        {
          key: 'current-streak',
          title: t('stats.currentStreak'),
          value: numberFormatter.format(stats.currentStreak),
          helper: t('stats.thisWeek'),
          icon: Flame,
        },
      ];
    }

    const stats = data.stats as AdminOverview;
    return [
      {
        key: 'total-users',
        title: t('stats.totalUsers'),
        value: numberFormatter.format(stats.totalUsers),
        helper: t('stats.allTime'),
        icon: Users,
      },
      {
        key: 'active-users',
        title: t('stats.activeUsers'),
        value: numberFormatter.format(stats.activeUsers),
        helper: t('stats.thisMonth'),
        icon: UserCheck,
      },
      {
        key: 'platform-sessions',
        title: t('stats.totalSessions'),
        value: numberFormatter.format(stats.totalSessions),
        helper: t('stats.thisMonth'),
        icon: Calendar,
      },
      {
        key: 'platform-completed',
        title: t('stats.completedSessions'),
        value: numberFormatter.format(stats.completedSessions),
        helper: t('stats.thisMonth'),
        icon: CheckCircle,
      },
      {
        key: 'platform-revenue',
        title: t('stats.totalRevenue'),
        value: currencyFormatter.format(stats.revenue || 0),
        helper: t('stats.thisMonth'),
        icon: DollarSign,
      },
      {
        key: 'active-coaches',
        title: t('stats.activeCoaches'),
        value: numberFormatter.format(stats.activeCoaches),
        helper: t('stats.thisMonth'),
        icon: Users,
      },
    ];
  }, [user?.role, data?.stats, t, numberFormatter, currencyFormatter, decimalFormatter]);

  const upcomingSessions = data?.upcomingSessions ?? [];

  const quickActions = useMemo<QuickActionConfig[]>(() => {
    if (!user?.role) {
      return [];
    }

    if (user.role === 'coach') {
      return [
        {
          key: 'schedule-session',
          label: t('quickActions.scheduleSession'),
          icon: Calendar,
          href: '/sessions/new' as AppRoute,
        },
        {
          key: 'view-clients',
          label: t('quickActions.viewClients'),
          icon: Users,
          href: '/coach/clients' as AppRoute,
        },
        {
          key: 'add-note',
          label: t('quickActions.addNote'),
          icon: MessageSquare,
          href: '/coach/notes' as AppRoute,
        },
      ];
    }

    if (user.role === 'client') {
      return [
        {
          key: 'book-session',
          label: t('quickActions.bookSession'),
          icon: Calendar,
          href: '/client/book' as AppRoute,
        },
        {
          key: 'add-reflection',
          label: t('quickActions.addReflection'),
          icon: MessageSquare,
          href: '/client/reflections' as AppRoute,
        },
        {
          key: 'view-progress',
          label: t('quickActions.viewProgress'),
          icon: TrendingUp,
          href: '/client/progress' as AppRoute,
        },
      ];
    }

    return [
      {
        key: 'manage-users',
        label: t('quickActions.manageUsers'),
        icon: Users,
      href: '/admin/users' as AppRoute,
      },
      {
        key: 'review-analytics',
        label: t('quickActions.reviewAnalytics'),
        icon: TrendingUp,
      href: '/admin/analytics' as AppRoute,
      },
      {
        key: 'system-health',
        label: t('quickActions.systemHealth'),
        icon: UserCheck,
      href: '/admin/system' as AppRoute,
      },
    ];
  }, [user?.role, t]);

  if (!user) {
    return null; // RouteGuard handles redirects
  }

  const roleVariant = user.role === 'admin' ? 'default' : user.role === 'coach' ? 'secondary' : 'outline';
  const roleLabel = user.role === 'admin' ? t('roles.admin') : user.role === 'coach' ? t('roles.coach') : t('roles.client');

  return (
    <>
      <div className="border-b bg-card/60 backdrop-blur supports-[backdrop-filter]:backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="page-title text-foreground">
                {t('welcome', { name: user.firstName || user.email })}
              </h1>
              <p className="page-subtitle mt-1">{t('subtitle')}</p>
            </div>
            <Badge variant={roleVariant}>{roleLabel}</Badge>
          </div>
          <div className="premium-divider mt-4" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {isError && (
          <div
            className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
            role="alert"
            aria-live="polite"
          >
            {t('loadError')}
          </div>
        )}

        <div
          className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
          data-testid="dashboard-stats-grid"
        >
          {isLoading
            ? Array.from({ length: (() => {
                  if (!user?.role) {
                    return 4;
                  }
                  if (user.role === 'client') {
                    return 7;
                  }
                  return 6;
                })() }).map((_, index) => (
                <Card key={`stats-skeleton-${index}`}>
                  <CardHeader className="space-y-2 pb-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="mt-2 h-3 w-20" />
                  </CardContent>
                </Card>
              ))
            : statsCards.map((card) => (
                <Card key={card.key}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                    <card.icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{card.value}</div>
                    {card.helper && (
                      <p className="text-xs text-muted-foreground">{card.helper}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {t('upcomingSessions.title')}
              </CardTitle>
              <CardDescription>{t('upcomingSessions.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={`upcoming-skeleton-${index}`}
                      className="rounded-lg border p-4"
                    >
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="mt-2 h-3 w-40" />
                      <Skeleton className="mt-2 h-3 w-24" />
                    </div>
                  ))}
                </div>
              ) : upcomingSessions.length > 0 ? (
                upcomingSessions.map((session) => {
                  const participantName = user.role === 'coach'
                    ? buildDisplayName(session.client)
                    : user.role === 'client'
                      ? buildDisplayName(session.coach)
                      : `${buildDisplayName(session.coach)} • ${buildDisplayName(session.client)}`;

                  return (
                    <div
                      key={session.id}
                      className="flex items-center justify-between gap-4 rounded-lg border p-4"
                    >
                      <div>
                        <h4 className="font-medium text-foreground">{session.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {t('upcomingSessions.with')} {participantName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {dateTimeFormatter.format(new Date(session.scheduledAt))}
                        </p>
                      </div>
                      <Button asChild variant="outline" size="sm" data-testid="view-session-button">
                        <Link href={`/sessions/${session.id}` as AppRoute} locale={locale}>
                          {commonT('view')}
                        </Link>
                      </Button>
                    </div>
                  );
                })
              ) : (
                <div className="py-10 text-center text-muted-foreground">
                  <Calendar className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p>{t('upcomingSessions.empty')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {t('quickActions.title')}
              </CardTitle>
              <CardDescription>{t('quickActions.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickActions.map((action) => (
                <Button
                  key={action.key}
                  variant="outline"
                  className="w-full justify-start"
                  asChild
                >
                  <Link href={action.href as Parameters<typeof Link>[0]['href']} locale={locale}>
                    <action.icon className="mr-2 h-4 w-4" />
                    {action.label}
                  </Link>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
