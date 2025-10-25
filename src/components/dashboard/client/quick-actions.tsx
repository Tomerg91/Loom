'use client';

import { Calendar, FileText, MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/routing';


interface ClientQuickActionsProps {}

const clientActions = [
  {
    key: 'schedule-session',
    icon: Calendar,
    href: '/client/book',
    labelKey: 'schedule',
  },
  {
    key: 'view-files',
    icon: FileText,
    href: '/files',
    labelKey: 'files',
  },
  {
    key: 'contact-coach',
    icon: MessageCircle,
    href: '/messages',
    labelKey: 'contact',
  },
] as const;

export function ClientQuickActions() {
  const t = useTranslations('dashboard.clientSections.quickActions');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {t('title')}
        </CardTitle>
        <CardDescription>{t('subtitle')}</CardDescription>
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
