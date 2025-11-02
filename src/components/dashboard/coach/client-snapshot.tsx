'use client';

import { CheckCircle, RefreshCw, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/routing';
import type { CoachDashboardSnapshot } from '@/modules/dashboard/types';

interface CoachClientSnapshotProps {
  snapshot: CoachDashboardSnapshot;
  isRefreshing?: boolean;
  onRefresh?: (() => void) | undefined;
  error?: string;
}

export function CoachClientSnapshot({
  snapshot,
  isRefreshing = false,
  onRefresh,
  error,
}: CoachClientSnapshotProps) {
  const t = useTranslations('dashboard.coachSections.clientSnapshot');
  const commonT = useTranslations('common');

  const pendingClientsCount = snapshot.stats.pendingClients;

  const nextSessions = useMemo(() => {
    return snapshot.clients
      .filter(client => client.nextSession)
      .sort((a, b) => {
        if (!a.nextSession) return 1;
        if (!b.nextSession) return -1;
        return (
          new Date(a.nextSession).getTime() - new Date(b.nextSession).getTime()
        );
      })
      .slice(0, 3);
  }, [snapshot.clients]);

  const showSkeleton = isRefreshing && snapshot.clients.length === 0;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('title')}
          </CardTitle>
          <CardDescription>{t('subtitle')}</CardDescription>
        </div>
        {onRefresh && (
          <Button
            onClick={onRefresh}
            variant="ghost"
            size="sm"
            className="inline-flex items-center gap-2 text-primary"
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
            />
            {commonT('refresh')}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {showSkeleton && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`client-snapshot-skeleton-${index}`}
                className="rounded-lg border p-4"
              >
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-2 h-3 w-24" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            <p>{t('error')}</p>
            {onRefresh && (
              <Button
                onClick={onRefresh}
                size="sm"
                variant="outline"
                className="mt-3"
              >
                {commonT('retry')}
              </Button>
            )}
          </div>
        )}

        {!showSkeleton && !error && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t('activeClients')}
                </p>
                <p className="text-2xl font-semibold text-foreground">
                  {snapshot.stats.activeClients}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t('totalClients')}
                </p>
                <p className="text-2xl font-semibold text-foreground">
                  {snapshot.stats.totalClients}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t('pendingRequests')}
                </p>
                <p className="text-2xl font-semibold text-foreground">
                  {pendingClientsCount}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t('completedSessions')}
                </p>
                <p className="text-2xl font-semibold text-foreground">
                  {snapshot.stats.completedSessions}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  {t('nextSessions')}
                </h3>
                <Button
                  asChild
                  size="sm"
                  variant="ghost"
                  className="px-0 text-primary"
                >
                  <Link href="/coach/clients">{t('viewAll')}</Link>
                </Button>
              </div>

              {nextSessions.length === 0 ? (
                <p className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-4 text-xs text-muted-foreground">
                  {t('noUpcoming')}
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {nextSessions.map(client => {
                    const name =
                      `${client.firstName ?? ''} ${client.lastName ?? ''}`.trim() ||
                      client.email ||
                      commonT('unknown');
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
                              {t('sessionScheduled', {
                                date: scheduledAt.toLocaleDateString(),
                              })}
                            </p>
                          )}
                        </div>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/coach/clients/${client.id}`}>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            {t('openProfile')}
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
