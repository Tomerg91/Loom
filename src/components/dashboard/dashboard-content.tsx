'use client';

import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthLoading, useUser } from '@/lib/store/auth-store';
import { createClient } from '@/lib/supabase/client';

import { ClientDashboard } from './client/client-dashboard';
import { CoachDashboard } from './coach/coach-dashboard';
import type { DashboardTranslations } from './dashboard-types';

interface DashboardContentProps {
  translations: DashboardTranslations;
  locale: string;
}

export function DashboardContent({ translations, locale }: DashboardContentProps) {
  const user = useUser();
  const isAuthLoading = useAuthLoading();
  const [resolvedRole, setResolvedRole] = useState<string | null>(user?.role ?? null);
  const [isRoleLoading, setIsRoleLoading] = useState<boolean>(true);
  const [roleError, setRoleError] = useState<string | null>(null);
  const { dashboard: t, common: commonT } = translations;

  useEffect(() => {
    let isMounted = true;

    async function determineRole() {
      if (!user?.id) {
        if (isMounted) {
          setResolvedRole(null);
          setIsRoleLoading(false);
        }
        return;
      }

      setIsRoleLoading(true);
      setRoleError(null);

      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.getUser();
        console.log('[DashboardContent] Role fetch result', { data, error });

        if (error) {
          throw error;
        }

        const metadataRole = data.user?.user_metadata?.role as string | undefined;

        if (isMounted) {
          setResolvedRole(metadataRole ?? user.role ?? null);
        }
      } catch (error) {
        console.error('[DashboardContent] Failed to determine user role', error);
        if (isMounted) {
          setResolvedRole(user?.role ?? null);
          setRoleError(error instanceof Error ? error.message : String(error));
        }
      } finally {
        if (isMounted) {
          setIsRoleLoading(false);
        }
      }
    }

    void determineRole();

    return () => {
      isMounted = false;
    };
  }, [user?.id, user?.role]);

  if (isAuthLoading || isRoleLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Card className="border-dashed border-muted-foreground/40 bg-muted/10 text-center">
          <CardContent className="py-10 text-sm font-medium text-muted-foreground">
            {commonT('loading')}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <Card className="border-dashed border-muted-foreground/40 bg-muted/10 text-center">
            <CardContent className="py-10 text-sm font-medium text-muted-foreground">
              {t('loadError')}
            </CardContent>
          </Card>
      </div>
    );
  }

    const role = resolvedRole ?? user.role;
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
        {roleError && (
          <div className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-900">
            {roleError}
          </div>
        )}
        {role === 'coach' && (
          <CoachDashboard
            userId={user.id}
            locale={locale}
            translations={translations}
            userName={user.firstName || user.email}
          />
        )}
        {role === 'client' && (
          <ClientDashboard userId={user.id} locale={locale} translations={translations} />
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
