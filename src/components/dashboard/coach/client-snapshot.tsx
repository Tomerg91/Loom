'use client';

import { useQuery } from '@tanstack/react-query';
import { CheckCircle, Users } from 'lucide-react';
import { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/routing';

import type { DashboardTranslations } from '../dashboard-types';

interface CoachStats {
  totalSessions: number;
  completedSessions: number;
  upcomingSessions: number;
  totalClients: number;
  activeClients: number;
}

interface CoachClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: 'active' | 'inactive' | 'pending';
  nextSession?: string;
  lastSession?: string;
}

interface ClientSnapshotData {
  stats: CoachStats;
  clients: CoachClient[];
}

async function fetchClientSnapshot(): Promise<ClientSnapshotData> {
  const [statsResponse, clientsResponse] = await Promise.all([
    fetch('/api/coach/stats', { cache: 'no-store', credentials: 'same-origin' }),
    fetch('/api/coach/clients?limit=12', { cache: 'no-store', credentials: 'same-origin' }),
  ]);

  if (!statsResponse.ok) {
    throw new Error('Failed to fetch coach stats');
  }

  const statsPayload = await statsResponse.json();
  const stats: CoachStats = {
    totalSessions: statsPayload.data?.totalSessions ?? 0,
    completedSessions: statsPayload.data?.completedSessions ?? 0,
    upcomingSessions: statsPayload.data?.upcomingSessions ?? 0,
    totalClients: statsPayload.data?.totalClients ?? 0,
    activeClients: statsPayload.data?.activeClients ?? 0,
  };

  let clients: CoachClient[] = [];
  if (clientsResponse.ok) {
    const clientsPayload = await clientsResponse.json();
    clients = (clientsPayload.data ?? []) as CoachClient[];
  }

  return { stats, clients };
}

export function CoachClientSnapshot({ translations }: { translations: DashboardTranslations }) {
  const { dashboard: t, common: commonT } = translations;

  const { data, isLoading, isError, refetch } = useQuery<ClientSnapshotData>({
    queryKey: ['coach-client-snapshot'],
    queryFn: fetchClientSnapshot,
    staleTime: 60_000,
  });

  const pendingClients = data?.clients.filter((client) => client.status === 'inactive' || client.status === 'pending') ?? [];

  const nextSessions = useMemo(() => {
    return (data?.clients ?? [])
      .filter((client) => client.nextSession)
      .sort((a, b) =>
        new Date(a.nextSession ?? 0).getTime() - new Date(b.nextSession ?? 0).getTime()
      )
      .slice(0, 3);
  }, [data?.clients]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {t('coachSections.clientSnapshot.title')}
        </CardTitle>
        <CardDescription>{t('coachSections.clientSnapshot.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={`client-snapshot-skeleton-${index}`} className="rounded-lg border p-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-2 h-3 w-24" />
              </div>
            ))}
          </div>
        )}

        {isError && !isLoading && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            <p>{t('coachSections.clientSnapshot.error')}</p>
            <Button onClick={() => refetch()} size="sm" variant="outline" className="mt-3">
              {commonT('retry')}
            </Button>
          </div>
        )}

        {!isLoading && !isError && data && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t('coachSections.clientSnapshot.activeClients')}
                </p>
                <p className="text-2xl font-semibold text-foreground">{data.stats.activeClients}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t('coachSections.clientSnapshot.totalClients')}
                </p>
                <p className="text-2xl font-semibold text-foreground">{data.stats.totalClients}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t('coachSections.clientSnapshot.pendingRequests')}
                </p>
                <p className="text-2xl font-semibold text-foreground">{pendingClients.length}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t('coachSections.clientSnapshot.completedSessions')}
                </p>
                <p className="text-2xl font-semibold text-foreground">{data.stats.completedSessions}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  {t('coachSections.clientSnapshot.nextSessions')}
                </h3>
                <Button asChild size="sm" variant="ghost" className="px-0 text-primary">
                  <Link href="/coach/clients">{t('coachSections.clientSnapshot.viewAll')}</Link>
                </Button>
              </div>

              {nextSessions.length === 0 ? (
                <p className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-4 text-xs text-muted-foreground">
                  {t('coachSections.clientSnapshot.noUpcoming')}
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {nextSessions.map((client) => {
                    const name = `${client.firstName} ${client.lastName}`.trim() || client.email;
                    const scheduledAt = client.nextSession
                      ? new Date(client.nextSession)
                      : undefined;

                    return (
                      <li
                        key={client.id}
                        className="flex items-center justify-between rounded-lg border border-border/60 bg-background p-3"
                      >
                        <div>
                          <p className="font-medium text-foreground">{name}</p>
                          {scheduledAt && (
                            <p className="text-xs text-muted-foreground">
                              {t('coachSections.clientSnapshot.sessionScheduled', {
                                date: scheduledAt.toLocaleDateString(),
                              })}
                            </p>
                          )}
                        </div>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/coach/clients/${client.id}`}>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            {t('coachSections.clientSnapshot.openProfile')}
                          </Link>
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
