'use client';

import { ClientGoalProgress } from './goal-progress';
import { ClientQuickActions } from './quick-actions';
import { ClientRecentMessages } from './recent-messages';
import { ClientUpcomingSessions } from './upcoming-sessions';
import type { DashboardTranslations } from '../dashboard-types';

interface ClientDashboardProps {
  userId: string;
  locale: string;
  translations: DashboardTranslations;
  userName: string;
}

export function ClientDashboard({ userId, locale, translations, userName }: ClientDashboardProps) {
  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <ClientUpcomingSessions
            userId={userId}
            locale={locale}
            translations={translations}
          />
          <ClientGoalProgress locale={locale} translations={translations} />
        </div>
        <div className="space-y-6">
          <ClientQuickActions translations={translations} />
          <ClientRecentMessages
            locale={locale}
            translations={translations}
            userName={userName}
          />
        </div>
      </div>
    </div>
  );
}
