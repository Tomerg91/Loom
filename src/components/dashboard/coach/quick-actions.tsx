'use client';

import { Calendar, PlusCircle, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/routing';

interface CoachQuickActionsProps {
  userName: string;
}

const coachActions = [
  {
    key: 'add-client',
    icon: PlusCircle,
    href: '/coach/clients',
    labelKey: 'addClient',
  },
  {
    key: 'view-calendar',
    icon: Calendar,
    href: '/sessions',
    labelKey: 'viewCalendar',
  },
  {
    key: 'manage-availability',
    icon: Settings,
    href: '/coach/availability',
    labelKey: 'manageAvailability',
  },
] as const;

export function CoachQuickActions({ userName }: CoachQuickActionsProps) {
  const t = useTranslations('dashboard.coachSections.quickActions');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {t('title', { name: userName.split(' ')[0] || userName })}
        </CardTitle>
        <CardDescription>{t('subtitle')}</CardDescription>
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
