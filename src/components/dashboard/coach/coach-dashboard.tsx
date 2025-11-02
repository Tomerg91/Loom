'use client';

import { useCallback } from 'react';

import { useCoachDashboardSummary } from '@/modules/dashboard/api/useCoachDashboardSummary';
import type { CoachDashboardSummary } from '@/modules/dashboard/types';

import { CoachClientSnapshot } from './client-snapshot';
import { CoachQuickActions } from './quick-actions';
import { CoachRecentActivityFeed } from './recent-activity-feed';
import { CoachTodaysAgenda } from './todays-agenda';

interface CoachDashboardProps {
  userId: string;
  locale: string;
  userName: string;
}

const EMPTY_SUMMARY: CoachDashboardSummary = {
  agenda: [],
  activity: [],
  snapshot: {
    stats: {
      totalSessions: 0,
      completedSessions: 0,
      upcomingSessions: 0,
      totalClients: 0,
      activeClients: 0,
      pendingClients: 0,
    },
    clients: [],
  },
  generatedAt: new Date(0).toISOString(),
};

export function CoachDashboard({
  userId,
  locale,
  userName,
}: CoachDashboardProps) {
  const { data, isLoading, isFetching, refetch, error } =
    useCoachDashboardSummary(userId);

  const summary = data ?? EMPTY_SUMMARY;
  const isRefreshing = !isLoading && isFetching;
  const errorMessage = error instanceof Error ? error.message : undefined;

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <CoachTodaysAgenda
            locale={locale}
            agenda={summary.agenda}
            isRefreshing={isRefreshing}
            onRefresh={handleRefresh}
            error={errorMessage}
          />
          <CoachRecentActivityFeed
            locale={locale}
            activity={summary.activity}
            isRefreshing={isRefreshing}
            onRefresh={handleRefresh}
            error={errorMessage}
          />
        </div>
        <div className="space-y-6">
          <CoachQuickActions userName={userName} />
          <CoachClientSnapshot
            snapshot={summary.snapshot}
            isRefreshing={isRefreshing}
            onRefresh={handleRefresh}
            error={errorMessage}
          />
        </div>
      </div>
    </div>
  );
}
