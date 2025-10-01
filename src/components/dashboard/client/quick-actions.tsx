'use client';

import { Calendar, FileText, MessageCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/routing';

import type { DashboardTranslations } from '../dashboard-types';

interface ClientQuickActionsProps {
  translations: DashboardTranslations;
}

const clientActions = [
  {
    key: 'schedule-session',
    icon: Calendar,
    href: '/client/book',
    labelKey: 'clientSections.quickActions.schedule',
  },
  {
    key: 'view-files',
    icon: FileText,
    href: '/files',
    labelKey: 'clientSections.quickActions.files',
  },
  {
    key: 'contact-coach',
    icon: MessageCircle,
    href: '/messages',
    labelKey: 'clientSections.quickActions.contact',
  },
] as const;

export function ClientQuickActions({ translations }: ClientQuickActionsProps) {
  const { dashboard: t } = translations;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {t('clientSections.quickActions.title')}
        </CardTitle>
        <CardDescription>{t('clientSections.quickActions.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {clientActions.map((action) => (
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
