'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthLoading, useUser } from '@/lib/store/auth-store';
import { createClient } from '@/lib/supabase/client';

import { ClientDashboard } from './client/client-dashboard';
import { CoachDashboard } from './coach/coach-dashboard';

interface DashboardContentProps {
  locale: string;
}

export function DashboardContent({ locale }: DashboardContentProps) {
  const user = useUser();
  const isAuthLoading = useAuthLoading();
  const t = useTranslations('dashboard');
  const commonT = useTranslations('common');

  // Add detailed logging for debugging
  useEffect(() => {
    console.log('[DashboardContent] Auth State:', {
      hasUser: !!user,
      userId: user?.id,
      userRole: user?.role,
      userEmail: user?.email,
      isAuthLoading,
      timestamp: new Date().toISOString()
    });
  }, [user, isAuthLoading]);

  // Loading state
  if (isAuthLoading) {
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

  // No user - should be caught by RouteGuard
  if (!user) {
    console.error('[DashboardContent] No user found after loading completed');
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

  // Use role directly from user object (already validated by auth system)
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
            userName={user.firstName || user.email}
          />
        )}
        {role === 'client' && (
          <ClientDashboard userId={user.id} locale={locale} />
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
