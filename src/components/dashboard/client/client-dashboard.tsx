'use client';

import { ClientGoalProgress } from './goal-progress';
import { ClientQuickActions } from './quick-actions';
import { ClientRecentMessages } from './recent-messages';
import { ClientUpcomingSessions } from './upcoming-sessions';

interface ClientDashboardProps {
  userId: string;
  locale: string;
}

export function ClientDashboard({ userId, locale }: ClientDashboardProps) {
  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <ClientUpcomingSessions
            userId={userId}
            locale={locale}
          />
          <ClientGoalProgress
            userId={userId}
            locale={locale}
          />
        </div>
        <div className="space-y-6">
          <ClientQuickActions />
          <ClientRecentMessages userId={userId} locale={locale} />
        </div>
      </div>
    </div>
  );
}
