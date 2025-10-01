'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/lib/store/auth-store';

import { ClientDashboard } from './client/client-dashboard';
import { CoachDashboard } from './coach/coach-dashboard';
import type { DashboardTranslations } from './dashboard-types';

interface DashboardContentProps {
  translations: DashboardTranslations;
  locale: string;
}

export function DashboardContent({ translations, locale }: DashboardContentProps) {
  const user = useUser();

  if (!user) {
    return null;
  }

  const { dashboard: t } = translations;

  const role = user.role;
  const roleVariant =
    role === 'admin' ? 'default' : role === 'coach' ? 'secondary' : 'outline';
  const roleLabel =
    role === 'admin' ? t('roles.admin') : role === 'coach' ? t('roles.coach') : t('roles.client');

  return (
    <>
      <div className="border-b bg-card/60 backdrop-blur supports-[backdrop-filter]:backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="page-title text-foreground">
                {t('welcome', { name: user.firstName || user.email })}
              </h1>
              <p className="page-subtitle mt-1">{t('subtitle')}</p>
            </div>
            <Badge variant={roleVariant}>{roleLabel}</Badge>
          </div>
          <div className="premium-divider mt-4" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {role === 'coach' && (
          <CoachDashboard
            userId={user.id}
            locale={locale}
            translations={translations}
            userName={user.firstName || user.email}
          />
        )}
        {role === 'client' && (
          <ClientDashboard
            userId={user.id}
            locale={locale}
            translations={translations}
            userName={user.firstName || user.email}
          />
        )}
        {role !== 'coach' && role !== 'client' && (
          <Card>
            <CardHeader>
              <CardTitle>{t('adminPlaceholder.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {t('adminPlaceholder.body')}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
