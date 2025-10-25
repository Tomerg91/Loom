'use client';

import { CoachClientSnapshot } from './client-snapshot';
import { CoachQuickActions } from './quick-actions';
import { CoachRecentActivityFeed } from './recent-activity-feed';
import { CoachTodaysAgenda } from './todays-agenda';

interface CoachDashboardProps {
  userId: string;
  locale: string;
  userName: string;
}

export function CoachDashboard({ userId, locale, userName }: CoachDashboardProps) {
  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <CoachTodaysAgenda userId={userId} locale={locale} />
          <CoachRecentActivityFeed locale={locale} />
        </div>
        <div className="space-y-6">
          <CoachQuickActions userName={userName} />
          <CoachClientSnapshot />
        </div>
      </div>
    </div>
  );
}
