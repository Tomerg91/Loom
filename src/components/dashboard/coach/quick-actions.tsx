'use client';

import { Calendar, PlusCircle, Settings } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/routing';

import type { DashboardTranslations } from '../dashboard-types';

interface CoachQuickActionsProps {
  translations: DashboardTranslations;
  userName: string;
}

const coachActions = [
  {
    key: 'add-client',
    icon: PlusCircle,
    href: '/coach/clients',
    labelKey: 'coachSections.quickActions.addClient',
  },
  {
    key: 'view-calendar',
    icon: Calendar,
    href: '/sessions',
    labelKey: 'coachSections.quickActions.viewCalendar',
  },
  {
    key: 'manage-availability',
    icon: Settings,
    href: '/coach/availability',
    labelKey: 'coachSections.quickActions.manageAvailability',
  },
] as const;

export function CoachQuickActions({ translations, userName }: CoachQuickActionsProps) {
  const { dashboard: t } = translations;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {t('coachSections.quickActions.title', { name: userName.split(' ')[0] || userName })}
        </CardTitle>
        <CardDescription>{t('coachSections.quickActions.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {coachActions.map((action) => (
          <Button key={action.key} asChild variant="outline" className="w-full justify-start">
            <Link href={action.href}>
              <action.icon className="mr-2 h-4 w-4" />
              {t(action.labelKey)}
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
