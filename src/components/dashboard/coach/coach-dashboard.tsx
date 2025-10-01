'use client';

import { CoachClientSnapshot } from './client-snapshot';
import { CoachQuickActions } from './quick-actions';
import { CoachRecentActivityFeed } from './recent-activity-feed';
import { CoachTodaysAgenda } from './todays-agenda';
import type { DashboardTranslations } from '../dashboard-types';

interface CoachDashboardProps {
  userId: string;
  locale: string;
  translations: DashboardTranslations;
  userName: string;
}

export function CoachDashboard({ userId, locale, translations, userName }: CoachDashboardProps) {
  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <CoachTodaysAgenda userId={userId} locale={locale} translations={translations} />
          <CoachRecentActivityFeed locale={locale} translations={translations} />
        </div>
        <div className="space-y-6">
          <CoachQuickActions translations={translations} userName={userName} />
          <CoachClientSnapshot translations={translations} />
        </div>
      </div>
    </div>
  );
}
