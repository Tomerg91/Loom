'use client';

import { useEffect } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { markPerformance } from '@/lib/performance';
import { useDashboardSummary, useUserProfile } from '@/lib/queries/dashboard';
import { useAuthLoading, useUser } from '@/lib/store/auth-store';

import { ClientDashboard } from './client/client-dashboard';
import { CoachDashboard } from './coach/coach-dashboard';
import type { DashboardTranslations } from './dashboard-types';

interface DashboardContentProps {
  translations: DashboardTranslations;
  locale: string;
}

export function DashboardContent({
  translations,
  locale,
}: DashboardContentProps) {
  const user = useUser();
  const isAuthLoading = useAuthLoading();
  const { dashboard: t, common: commonT } = translations;

  // Parallel queries - both fire immediately when user is available
  const profileQuery = useUserProfile();
  const summaryQuery = useDashboardSummary();

  // Add detailed logging for debugging
  useEffect(() => {
    console.log('[DashboardContent] Auth State:', {
      hasUser: !!user,
      userId: user?.id,
      userRole: user?.role,
      userEmail: user?.email,
      isAuthLoading,
      timestamp: new Date().toISOString(),
    });
  }, [user, isAuthLoading]);

  // Log query states
  useEffect(() => {
    console.log('[DashboardContent] Query States:', {
      profile: {
        isLoading: profileQuery.isLoading,
        isError: profileQuery.isError,
        hasData: !!profileQuery.data,
      },
      summary: {
        isLoading: summaryQuery.isLoading,
        isError: summaryQuery.isError,
        hasData: !!summaryQuery.data,
      },
      timestamp: new Date().toISOString(),
    });
  }, [profileQuery, summaryQuery]);

  // Performance marks - dashboard interactive
  useEffect(() => {
    markPerformance('dashboard-interactive');
  }, []);

  // Performance marks - profile loaded
  useEffect(() => {
    if (profileQuery.data) {
      markPerformance('profile-loaded');
    }
  }, [profileQuery.data]);

  // Performance marks - summary loaded
  useEffect(() => {
    if (summaryQuery.data) {
      markPerformance('summary-loaded');
    }
  }, [summaryQuery.data]);

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

  // Handle query errors gracefully
  if (profileQuery.isError) {
    console.error(
      '[DashboardContent] Profile query error:',
      profileQuery.error
    );
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="py-10">
            <p className="text-center text-sm font-medium text-destructive">
              Error loading profile. Please try again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (summaryQuery.isError) {
    console.error(
      '[DashboardContent] Summary query error:',
      summaryQuery.error
    );
    // Don't block the entire UI for summary errors - show error in specific section
  }

  // Use role directly from user object (already validated by auth system)
  const role = user.role;
  const roleVariant =
    role === 'admin' ? 'default' : role === 'coach' ? 'secondary' : 'outline';
  const roleLabel =
    role === 'admin'
      ? t('roles.admin')
      : role === 'coach'
        ? t('roles.coach')
        : t('roles.client');

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
